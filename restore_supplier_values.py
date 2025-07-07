#!/usr/bin/env python3
"""
Script para restaurar os valores originais de supplier_price e supplier_tax
usando o arquivo CSV supplier_values_fix_report.csv.
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
        logging.FileHandler("restore_supplier_values.log"),
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
    Lê os dados do arquivo CSV e retorna um dicionário com os valores originais.
    
    Args:
        csv_file: Caminho para o arquivo CSV
        
    Returns:
        Dicionário com os valores originais, usando order_item_id como chave
    """
    original_values = {}
    
    try:
        with open(csv_file, 'r') as f:
            reader = csv.DictReader(f)
            for row in reader:
                order_item_id = int(row['order_item_id'])
                original_price = row['original_price']
                original_tax = row['original_tax']
                
                original_values[order_item_id] = {
                    'supplier_price': float(original_price) if original_price != 'None' else None,
                    'supplier_tax': float(original_tax) if original_tax != 'None' and original_tax != 'NULL' else None
                }
                
        logger.info(f"Lidos {len(original_values)} registros do arquivo CSV.")
        return original_values
    except Exception as e:
        logger.error(f"Erro ao ler arquivo CSV: {e}")
        return {}

def restore_original_values(conn, original_values, apply=False):
    """
    Restaura os valores originais de supplier_price e supplier_tax no banco de dados.
    
    Args:
        conn: Conexão com o banco de dados
        original_values: Dicionário com os valores originais
        apply: Se True, aplica as atualizações no banco de dados
        
    Returns:
        Número de ordens atualizadas com sucesso
    """
    updated_count = 0
    errors = 0
    
    try:
        with conn.cursor() as cur:
            for order_item_id, values in original_values.items():
                supplier_price = values['supplier_price']
                supplier_tax = values['supplier_tax']
                
                if apply:
                    # Atualiza os valores no banco de dados
                    update_query = """
                    UPDATE orders
                    SET 
                        supplier_price = %s,
                        supplier_tax = %s
                    WHERE 
                        order_item_id = %s
                    """
                    cur.execute(update_query, (supplier_price, supplier_tax, order_item_id))
                    
                    logger.info(
                        f"Ordem {order_item_id} restaurada: "
                        f"supplier_price: {supplier_price}, supplier_tax: {supplier_tax}"
                    )
                else:
                    logger.info(
                        f"Ordem {order_item_id} seria restaurada: "
                        f"supplier_price: {supplier_price}, supplier_tax: {supplier_tax}"
                    )
                
                updated_count += 1
            
            # Commit das alterações
            if apply:
                conn.commit()
                logger.info(f"Total de {updated_count} ordens restauradas com sucesso.")
                if errors > 0:
                    logger.warning(f"Ocorreram {errors} erros durante a restauração.")
            else:
                logger.info(f"Total de {updated_count} ordens seriam restauradas (modo simulação).")
            
            return updated_count
    except Exception as e:
        logger.error(f"Erro durante o processo de restauração: {e}")
        conn.rollback()
        return 0

def update_profit_calculations(conn, original_values, apply=False):
    """
    Atualiza os cálculos de profit, margin e roi após restaurar os valores originais.
    
    Args:
        conn: Conexão com o banco de dados
        original_values: Dicionário com os valores originais
        apply: Se True, aplica as atualizações no banco de dados
        
    Returns:
        Número de ordens atualizadas com sucesso
    """
    updated_count = 0
    errors = 0
    
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            # Busca informações adicionais necessárias para o cálculo
            for order_item_id in original_values.keys():
                query = """
                SELECT 
                    order_item_id, 
                    quantity_sold, 
                    amazon_price,
                    amazon_fee,
                    supplier_shipping,
                    customer_shipping
                FROM 
                    orders
                WHERE 
                    order_item_id = %s
                """
                cur.execute(query, (order_item_id,))
                order = cur.fetchone()
                
                if not order:
                    logger.warning(f"Ordem {order_item_id} não encontrada no banco de dados.")
                    continue
                
                # Obtém os valores originais
                supplier_price = original_values[order_item_id]['supplier_price']
                supplier_tax = original_values[order_item_id]['supplier_tax']
                
                # Calcula profit, margin e roi
                try:
                    quantity = order['quantity_sold']
                    amazon_price = order['amazon_price']
                    amazon_fee = order['amazon_fee']
                    supplier_shipping = order['supplier_shipping']
                    customer_shipping = order['customer_shipping']
                    
                    # Calcula profit
                    profit = (
                        amazon_price - 
                        amazon_fee - 
                        (supplier_price * quantity) - 
                        (supplier_tax * quantity if supplier_tax else 0) - 
                        (supplier_shipping if supplier_shipping else 0) - 
                        (customer_shipping if customer_shipping else 0)
                    )
                    
                    # Calcula margin
                    margin = None
                    if amazon_price and amazon_price > 0:
                        margin = (profit / amazon_price) * 100
                    
                    # Calcula roi
                    roi = None
                    cost = (
                        (supplier_price * quantity) + 
                        (supplier_tax * quantity if supplier_tax else 0) + 
                        (supplier_shipping if supplier_shipping else 0) + 
                        (customer_shipping if customer_shipping else 0)
                    )
                    if cost > 0:
                        roi = (profit / cost) * 100
                    
                    if apply:
                        # Atualiza os valores no banco de dados
                        with conn.cursor() as update_cur:
                            update_query = """
                            UPDATE orders
                            SET 
                                profit = %s,
                                margin = %s,
                                roi = %s
                            WHERE 
                                order_item_id = %s
                            """
                            update_cur.execute(update_query, (profit, margin, roi, order_item_id))
                        
                        logger.info(
                            f"Cálculos atualizados para ordem {order_item_id}: "
                            f"profit: {profit}, margin: {margin}, roi: {roi}"
                        )
                    else:
                        logger.info(
                            f"Cálculos seriam atualizados para ordem {order_item_id}: "
                            f"profit: {profit}, margin: {margin}, roi: {roi}"
                        )
                    
                    updated_count += 1
                except Exception as e:
                    logger.error(f"Erro ao atualizar cálculos para ordem {order_item_id}: {e}")
                    errors += 1
            
            # Commit das alterações
            if apply:
                conn.commit()
                logger.info(f"Total de {updated_count} ordens com cálculos atualizados com sucesso.")
                if errors > 0:
                    logger.warning(f"Ocorreram {errors} erros durante a atualização dos cálculos.")
            else:
                logger.info(f"Total de {updated_count} ordens teriam cálculos atualizados (modo simulação).")
            
            return updated_count
    except Exception as e:
        logger.error(f"Erro durante o processo de atualização dos cálculos: {e}")
        conn.rollback()
        return 0

def main():
    """Função principal do script."""
    parser = argparse.ArgumentParser(description='Restaura os valores originais de supplier_price e supplier_tax usando o arquivo CSV.')
    parser.add_argument('--csv-file', type=str, default='supplier_values_fix_report.csv', help='Caminho para o arquivo CSV com os valores originais')
    parser.add_argument('--apply', action='store_true', help='Aplica as atualizações no banco de dados. Se não especificado, apenas simula as atualizações.')
    parser.add_argument('--update-calculations', action='store_true', help='Atualiza os cálculos de profit, margin e roi após restaurar os valores originais.')
    args = parser.parse_args()
    
    logger.info("Iniciando restauração dos valores originais de supplier_price e supplier_tax...")
    logger.info(f"Arquivo CSV: {args.csv_file}")
    logger.info(f"Modo: {'Aplicar atualizações' if args.apply else 'Apenas simular'}")
    logger.info(f"Atualizar cálculos: {'Sim' if args.update_calculations else 'Não'}")
    
    # Conecta ao banco de dados
    conn = connect_to_db()
    
    try:
        # Lê os dados do arquivo CSV
        original_values = read_csv_data(args.csv_file)
        
        if not original_values:
            logger.error("Nenhum valor original encontrado no arquivo CSV.")
            return
        
        # Restaura os valores originais
        updated_count = restore_original_values(conn, original_values, args.apply)
        
        if updated_count > 0 and args.update_calculations:
            # Atualiza os cálculos de profit, margin e roi
            updated_calc_count = update_profit_calculations(conn, original_values, args.apply)
            logger.info(f"Total de {updated_calc_count} ordens com cálculos atualizados.")
        
        logger.info("Processo concluído.")
        
    except Exception as e:
        logger.error(f"Erro durante a execução do script: {e}")
    finally:
        conn.close()
        logger.info("Conexão com o banco de dados encerrada.")

if __name__ == "__main__":
    main()
