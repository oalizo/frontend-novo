const multer = require('multer');
const csvParser = require('csv-parser');
const fs = require('fs');
const path = require('path');

// Configuração do multer para upload de CSV
const upload = multer({ dest: 'uploads/' });

// Classe simples para SSE (Server-Sent Events)
class SSEChannel {
  constructor() {
    this.clients = [];
  }
  
  addClient(client) {
    this.clients.push(client);
    console.log(`Client ${client.id} connected to SSE channel. Total clients: ${this.clients.length}`);
  }
  
  removeClient(clientId) {
    this.clients = this.clients.filter(client => client.id !== clientId);
    console.log(`Client ${clientId} disconnected from SSE channel. Remaining clients: ${this.clients.length}`);
  }
  
  sendEventToAll(event, data) {
    this.clients.forEach(client => {
      client.res.write(`event: ${event}\n`);
      client.res.write(`data: ${JSON.stringify(data)}\n\n`);
    });
  }
}

const blacklistSSE = new SSEChannel();

module.exports = (app, pool) => {
  // Rota para obter todos os itens da blacklist com paginação
  app.get('/api/blacklist', async (req, res) => {
    try {
      const { search, type } = req.query;
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 50;
      const offset = (page - 1) * limit;

      let whereClause = 'WHERE 1=1';
      const values = [];
      
      if (search) {
        values.push(`%${search.toLowerCase()}%`);
        whereClause += ` AND (LOWER(asin) LIKE $${values.length} OR LOWER(brand) LIKE $${values.length})`;
      }
      
      if (type === 'asin') {
        whereClause += ' AND brand IS NULL';
      } else if (type === 'brand') {
        whereClause += ' AND brand IS NOT NULL';
      }

      // Query para contar total de registros
      const countQuery = `SELECT COUNT(*) FROM black_list ${whereClause}`;
      const countResult = await pool.query(countQuery, values);
      const totalItems = parseInt(countResult.rows[0].count);
      const totalPages = Math.ceil(totalItems / limit);

      // Query para buscar os dados paginados
      const dataQuery = `
        SELECT * FROM black_list 
        ${whereClause}
        ORDER BY created_at DESC 
        LIMIT $${values.length + 1} OFFSET $${values.length + 2}
      `;
      const dataParams = [...values, limit, offset];
      const result = await pool.query(dataQuery, dataParams);

      res.json({
        success: true,
        data: result.rows,
        pagination: {
          currentPage: page,
          totalPages: totalPages,
          totalItems: totalItems,
          itemsPerPage: limit,
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1
        }
      });
    } catch (error) {
      console.error('Error fetching blacklist items:', error);
      res.status(500).json({ error: 'Failed to fetch blacklist items' });
    }
  });

  // Rota para adicionar um ASIN à blacklist
  app.post('/api/blacklist/asin', async (req, res) => {
    try {
      const { asin, brand } = req.body;
      
      if (!asin) {
        return res.status(400).json({ error: 'ASIN is required' });
      }
      
      // Verificar se o ASIN já existe
      const existingItem = await pool.query('SELECT * FROM black_list WHERE asin = $1', [asin]);
      if (existingItem.rows.length > 0) {
        return res.status(409).json({ error: 'ASIN already in blacklist' });
      }
      
      // Se não foi fornecida uma marca, usar "Unknown" como padrão
      const brandToUse = brand || 'Unknown';
      
      // Adicionar à blacklist
      const result = await pool.query(
        'INSERT INTO black_list (asin, brand) VALUES ($1, $2) RETURNING *',
        [asin, brandToUse]
      );
      
      res.status(201).json(result.rows[0]);
    } catch (error) {
      console.error('Error adding ASIN to blacklist:', error);
      res.status(500).json({ error: 'Failed to add ASIN to blacklist' });
    }
  });

  // Rota para adicionar uma marca à blacklist
  app.post('/api/blacklist/brand', async (req, res) => {
    try {
      const { brand } = req.body;
      
      if (!brand) {
        return res.status(400).json({ error: 'Brand name is required' });
      }
      
      // Verificar se a marca já existe
      const existingItem = await pool.query('SELECT * FROM black_list WHERE brand = $1', [brand]);
      if (existingItem.rows.length > 0) {
        return res.status(409).json({ error: 'Brand already in blacklist' });
      }
      
      // Adicionar à blacklist
      const result = await pool.query(
        'INSERT INTO black_list (brand) VALUES ($1) RETURNING *',
        [brand]
      );
      
      // Simular o processamento de vários ASINs da marca
      processBrand(brand, pool);
      
      res.status(201).json(result.rows[0]);
    } catch (error) {
      console.error('Error adding brand to blacklist:', error);
      res.status(500).json({ error: 'Failed to add brand to blacklist' });
    }
  });

  // Rota para upload de CSV
  app.post('/api/blacklist/csv', upload.single('file'), async (req, res) => {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    
    try {
      const results = [];
      
      fs.createReadStream(req.file.path)
        .pipe(csvParser())
        .on('data', (data) => {
          if (data.asin) {
            results.push({
              asin: data.asin,
              brand: data.brand || null
            });
          }
        })
        .on('end', async () => {
          // Remover o arquivo temporário
          fs.unlinkSync(req.file.path);
          
          if (results.length === 0) {
            return res.status(400).json({ error: 'No valid ASINs found in CSV' });
          }
          
          // Adicionar itens ao banco de dados
          const addedItems = [];
          for (const item of results) {
            try {
              const existingItem = await pool.query('SELECT * FROM black_list WHERE asin = $1', [item.asin]);
              if (existingItem.rows.length === 0) {
                const result = await pool.query(
                  'INSERT INTO black_list (asin, brand) VALUES ($1, $2) RETURNING *',
                  [item.asin, item.brand]
                );
                addedItems.push(result.rows[0]);
              }
            } catch (err) {
              console.error(`Error adding item ${item.asin}:`, err);
            }
          }
          
          res.json({
            message: `Added ${addedItems.length} of ${results.length} items to blacklist`,
            addedItems
          });
        });
    } catch (error) {
      console.error('Error processing CSV:', error);
      // Tentar remover o arquivo temporário
      if (req.file && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
      res.status(500).json({ error: 'Failed to process CSV file' });
    }
  });

  // Rota para excluir um item da blacklist
  app.delete('/api/blacklist/:id', async (req, res) => {
    try {
      const { id } = req.params;
      
      // Verificar se o item existe
      const existingItem = await pool.query('SELECT * FROM black_list WHERE id = $1', [id]);
      if (existingItem.rows.length === 0) {
        return res.status(404).json({ error: 'Item not found' });
      }
      
      // Excluir o item
      await pool.query('DELETE FROM black_list WHERE id = $1', [id]);
      
      res.json({ 
        message: 'Item removed successfully',
        item: existingItem.rows[0]
      });
    } catch (error) {
      console.error('Error removing item from blacklist:', error);
      res.status(500).json({ error: 'Failed to remove item from blacklist' });
    }
  });

  // Rota para SSE (Server-Sent Events) - Busca de ASINs por marca
  app.get('/api/blacklist/brand/stream', (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers', 'Cache-Control');
    res.setHeader('Access-Control-Allow-Methods', 'GET');
    res.setHeader('X-Accel-Buffering', 'no'); // Para Nginx
    
    const { brand, referenceAsin } = req.query;
    
    if (!brand || !referenceAsin) {
      res.write(`data: ${JSON.stringify({ type: 'error', message: 'Brand and referenceAsin are required' })}\n\n`);
      res.end();
      return;
    }
    
    // Simular busca de ASINs por marca
    simulateBrandSearch(brand, referenceAsin, res, pool);
    
    req.on('close', () => {
      console.log('SSE connection closed');
    });
  });

  // Rota para verificar o status da API da Amazon
  app.get('/api/blacklist/amazon/status', (req, res) => {
    // Simulação: em um sistema real, você faria uma chamada de teste para a API da Amazon
    const isConnected = Math.random() > 0.2; // 80% de chance de estar conectado
    
    res.json({
      status: isConnected ? 'connected' : 'disconnected',
      timestamp: new Date()
    });
  });

  // Simulação de busca de ASINs por marca via SSE
  async function simulateBrandSearch(brand, referenceAsin, res, pool) {
    try {
      // Enviar evento de início
      res.write(`data: ${JSON.stringify({ 
        type: 'start', 
        message: `Iniciando busca de ASINs para a marca: ${brand}` 
      })}\n\n`);

      // Simular múltiplas consultas (como no sistema original)
      const totalQueries = Math.floor(Math.random() * 5) + 3; // 3-7 consultas
      let totalFound = 0;
      let totalSaved = 0;

      for (let i = 1; i <= totalQueries; i++) {
        // Enviar log de consulta
        res.write(`data: ${JSON.stringify({ 
          type: 'log', 
          message: `Consulta ${i}/${totalQueries}: Buscando produtos da marca ${brand}...` 
        })}\n\n`);

        // Simular tempo de consulta
        await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000));

        // Simular ASINs encontrados nesta consulta
        const foundInQuery = Math.floor(Math.random() * 8) + 2; // 2-9 ASINs por consulta
        totalFound += foundInQuery;

        // Adicionar ASINs simulados ao banco
        for (let j = 0; j < foundInQuery; j++) {
          const mockAsin = `B${Math.floor(Math.random() * 10000000000).toString().padStart(9, '0')}`;
          
          try {
            // Verificar se já existe
            const existing = await pool.query('SELECT * FROM black_list WHERE asin = $1', [mockAsin]);
            if (existing.rows.length === 0) {
              await pool.query(
                'INSERT INTO black_list (asin, brand) VALUES ($1, $2)',
                [mockAsin, brand]
              );
              totalSaved++;
            }
          } catch (err) {
            console.error('Error saving ASIN:', err);
          }
        }

        // Enviar progresso
        res.write(`data: ${JSON.stringify({ 
          type: 'progress', 
          data: {
            query: `Página ${i} - ${foundInQuery} ASINs encontrados`,
            currentQuery: i,
            totalQueries: totalQueries,
            totalFound: totalFound,
            totalSaved: totalSaved
          }
        })}\n\n`);
      }

      // Enviar evento de conclusão
      res.write(`data: ${JSON.stringify({ 
        type: 'complete', 
        success: true,
        message: `Busca concluída! ${totalSaved} ASINs adicionados à blacklist.`,
        totalFound: totalFound,
        totalSaved: totalSaved
      })}\n\n`);

      res.end();

    } catch (error) {
      console.error('Error in brand search simulation:', error);
      res.write(`data: ${JSON.stringify({ 
        type: 'error', 
        message: `Erro durante a busca: ${error.message}` 
      })}\n\n`);
      res.end();
    }
  }

  // Simulação de processamento de marca
  function processBrand(brandName, pool) {
    const totalItems = Math.floor(Math.random() * 10) + 5; // 5-15 itens
    let processed = 0;
    
    const interval = setInterval(async () => {
      processed++;
      
      // Enviar atualização via SSE
      blacklistSSE.sendEventToAll('brand-progress', {
        brand: brandName,
        current: processed,
        total: totalItems,
        percentage: Math.round((processed / totalItems) * 100)
      });
      
      // Adicionar um ASIN simulado para a marca
      try {
        const mockAsin = `B${Math.floor(Math.random() * 10000000000).toString().padStart(9, '0')}`;
        await pool.query(
          'INSERT INTO black_list (asin, brand) VALUES ($1, $2) RETURNING *',
          [mockAsin, brandName]
        );
      } catch (err) {
        console.error('Error in brand processing simulation:', err);
      }
      
      if (processed >= totalItems) {
        clearInterval(interval);
        blacklistSSE.sendEventToAll('brand-complete', {
          brand: brandName,
          itemsAdded: processed
        });
      }
    }, 1000);
  }
}; 