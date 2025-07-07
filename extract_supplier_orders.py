#!/usr/bin/env python3
"""
Script para extrair os dados de order_id e supplier_order_id relacionados e salvá-los em um novo CSV.
"""

import os
import sys
import csv
import psycopg2
from psycopg2.extras import RealDictCursor
import logging
import argparse

# Configuração de logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler("extract_supplier_orders.log"),
        logging.StreamHandler(sys.stdout)
    ]
)
logger = logging.getLogger(__name__)

def connect_to_db():
    """Estabelece conexão com o banco de dados."""
    try:
        conn = psycopg2.connect(
            dbname='postgres', 
            user='postgres.bvbnofnnbfdlnpuswlgy', 
            host='aws-0-us-east-1.pooler.supabase.com', 
            password='Bi88An6B9L0EIihL',
            port='6543'
        )
        logger.info("Conexão com o banco de dados estabelecida com sucesso.")
        return conn
    except Exception as e:
        logger.error(f"Erro ao conectar ao banco de dados: {e}")
        sys.exit(1)

def read_csv_data(csv_file):
    """
    Lê os dados do arquivo CSV e retorna uma lista de order_item_id e order_id.
    
    Args:
        csv_file: Caminho para o arquivo CSV
        
    Returns:
        Lista de dicionários com order_item_id e order_id
    """
    orders_data = []
    
    try:
        with open(csv_file, 'r') as f:
            reader = csv.DictReader(f)
            for row in reader:
                order_item_id = int(row['order_item_id'])
                order_id = row['order_id']
                quantity_sold = int(row['quantity_sold'])
                original_price = row['original_price']
                
                orders_data.append({
                    'order_item_id': order_item_id,
                    'order_id': order_id,
                    'quantity_sold': quantity_sold,
                    'original_price': original_price if original_price != 'None' else None
                })
                
        logger.info(f"Lidos {len(orders_data)} registros do arquivo CSV.")
        return orders_data
    except Exception as e:
        logger.error(f"Erro ao ler arquivo CSV: {e}")
        return []

def get_supplier_order_ids(conn, orders_data):
    """
    Busca os supplier_order_id relacionados a cada order_id no banco de dados.
    
    Args:
        conn: Conexão com o banco de dados
        orders_data: Lista de dicionários com order_item_id e order_id
        
    Returns:
        Lista de dicionários com order_item_id, order_id, supplier_order_id e outros dados
    """
    result_data = []
    
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            for order in orders_data:
                order_item_id = order['order_item_id']
                
                query = """
                SELECT 
                    order_item_id, 
                    order_id, 
                    supplier_order_id,
                    quantity_sold,
                    supplier_price,
                    supplier_tax,
                    amazon_price,
                    amazon_fee,
                    supplier_shipping,
                    customer_shipping,
                    profit,
                    margin,
                    roi
                FROM 
                    orders
                WHERE 
                    order_item_id = %s
                """
                cur.execute(query, (order_item_id,))
                db_order = cur.fetchone()
                
                if db_order:
                    # Adiciona os dados originais do CSV
                    db_order['original_price'] = order['original_price']
                    result_data.append(dict(db_order))
                else:
                    logger.warning(f"Ordem {order_item_id} não encontrada no banco de dados.")
            
            logger.info(f"Encontrados {len(result_data)} registros no banco de dados.")
            return result_data
    except Exception as e:
        logger.error(f"Erro ao buscar supplier_order_id: {e}")
        return []

def save_to_csv(data, output_file):
    """
    Salva os dados em um novo arquivo CSV.
    
    Args:
        data: Lista de dicionários com os dados a serem salvos
        output_file: Caminho para o arquivo CSV de saída
    """
    try:
        if not data:
            logger.error("Nenhum dado para salvar.")
            return
        
        # Define as colunas do CSV
        fieldnames = [
            'order_item_id', 
            'order_id', 
            'supplier_order_id',
            'quantity_sold',
            'original_price',
            'supplier_price',
            'supplier_tax',
            'amazon_price',
            'amazon_fee',
            'supplier_shipping',
            'customer_shipping',
            'profit',
            'margin',
            'roi'
        ]
        
        with open(output_file, 'w', newline='') as f:
            writer = csv.DictWriter(f, fieldnames=fieldnames)
            writer.writeheader()
            
            for row in data:
                # Garante que todas as colunas estejam presentes
                row_data = {field: row.get(field, '') for field in fieldnames}
                writer.writerow(row_data)
        
        logger.info(f"Dados salvos com sucesso em {output_file}.")
    except Exception as e:
        logger.error(f"Erro ao salvar dados em CSV: {e}")

def main():
    """Função principal do script."""
    parser = argparse.ArgumentParser(description='Extrai os dados de order_id e supplier_order_id relacionados e salva em um novo CSV.')
    parser.add_argument('--input-csv', type=str, default='supplier_values_fix_report.csv', help='Caminho para o arquivo CSV de entrada')
    parser.add_argument('--output-csv', type=str, default='supplier_orders_data.csv', help='Caminho para o arquivo CSV de saída')
    args = parser.parse_args()
    
    logger.info("Iniciando extração de dados de supplier_order_id...")
    logger.info(f"Arquivo CSV de entrada: {args.input_csv}")
    logger.info(f"Arquivo CSV de saída: {args.output_csv}")
    
    # Conecta ao banco de dados
    conn = connect_to_db()
    
    try:
        # Lê os dados do arquivo CSV
        orders_data = read_csv_data(args.input_csv)
        
        if not orders_data:
            logger.error("Nenhum dado encontrado no arquivo CSV de entrada.")
            return
        
        # Busca os supplier_order_id relacionados
        result_data = get_supplier_order_ids(conn, orders_data)
        
        if not result_data:
            logger.error("Nenhum supplier_order_id encontrado.")
            return
        
        # Salva os dados em um novo arquivo CSV
        save_to_csv(result_data, args.output_csv)
        
        logger.info("Processo concluído.")
        
    except Exception as e:
        logger.error(f"Erro durante a execução do script: {e}")
    finally:
        conn.close()
        logger.info("Conexão com o banco de dados encerrada.")

if __name__ == "__main__":
    main()
