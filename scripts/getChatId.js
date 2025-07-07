require('dotenv').config();
const axios = require('axios');

async function getChatId() {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  
  if (!token) {
    console.error('❌ TELEGRAM_BOT_TOKEN não encontrado no .env');
    return;
  }

  try {
    console.log('🤖 Buscando atualizações do bot...');
    console.log('💬 Envie uma mensagem para o bot @OrdersProcessorBot agora!');
    
    const response = await axios.get(`https://api.telegram.org/bot${token}/getUpdates`);
    const updates = response.data.result;
    
    if (updates.length === 0) {
      console.log('📱 Nenhuma mensagem encontrada. Envie /start para o bot e execute novamente.');
      return;
    }
    
    console.log('\n🎯 CHAT IDs encontrados:');
    console.log('================================');
    
    const chatIds = new Set();
    updates.forEach((update, index) => {
      if (update.message) {
        const chatId = update.message.chat.id;
        const firstName = update.message.chat.first_name || 'Desconhecido';
        const username = update.message.chat.username ? `@${update.message.chat.username}` : '';
        
        if (!chatIds.has(chatId)) {
          console.log(`👤 Nome: ${firstName} ${username}`);
          console.log(`🆔 Chat ID: ${chatId}`);
          console.log(`💬 Última mensagem: "${update.message.text}"`);
          console.log('--------------------------------');
          chatIds.add(chatId);
        }
      }
    });
    
    if (chatIds.size === 1) {
      const chatId = Array.from(chatIds)[0];
      console.log(`\n✅ SEU CHAT_ID: ${chatId}`);
      console.log('\n📝 Copie este ID e cole no arquivo .env:');
      console.log(`TELEGRAM_CHAT_ID="${chatId}"`);
    } else {
      console.log(`\n⚠️ Encontrados ${chatIds.size} chat IDs. Use o seu.`);
    }
    
  } catch (error) {
    console.error('❌ Erro ao buscar Chat ID:', error.message);
  }
}

getChatId();
