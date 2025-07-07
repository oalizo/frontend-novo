#!/usr/bin/env python3
"""
Script para atualizar os valores de supplier_price, profit, margin e roi
usando o MCP (Supabase) com base nos dados do CSV.
"""

import csv
import logging
import sys
import argparse
import time

# Configuração de logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler("update_orders_via_mcp.log"),
        logging.StreamHandler(sys.stdout)
    ]
)
logger = logging.getLogger(__name__)

def read_csv_data(csv_file):
    """
    Lê os dados do arquivo CSV.
    
    Args:
        csv_file: Caminho para o arquivo CSV
        
    Returns:
        Lista de dicionários com os dados do CSV
    """
    try:
        data = []
        with open(csv_file, 'r') as f:
            reader = csv.DictReader(f)
            for row in reader:
                data.append(row)
        
        logger.info(f"Lidos {len(data)} registros do arquivo CSV.")
        return data
    except Exception as e:
        logger.error(f"Erro ao ler arquivo CSV: {e}")
        return []

def update_order_via_mcp(order_item_id, supplier_price, quantity_sold, amazon_price, amazon_fee, 
                         supplier_shipping, customer_shipping, supplier_tax, project_id, apply=False):
    """
    Atualiza uma ordem via MCP (Supabase).
    
    Args:
        order_item_id: ID do item do pedido
        supplier_price: Preço do fornecedor
        quantity_sold: Quantidade vendida
        amazon_price: Preço da Amazon
        amazon_fee: Taxa da Amazon
        supplier_shipping: Frete do fornecedor
        customer_shipping: Frete do cliente
        supplier_tax: Imposto do fornecedor
        project_id: ID do projeto Supabase
        apply: Se True, aplica as atualizações
        
    Returns:
        True se a atualização foi bem-sucedida, False caso contrário
    """
    try:
        # Converte valores para float
        supplier_price = float(supplier_price) if supplier_price and supplier_price != '' else 0
        quantity_sold = int(quantity_sold) if quantity_sold and quantity_sold != '' else 1
        amazon_price = float(amazon_price) if amazon_price and amazon_price != '' else 0
        amazon_fee = float(amazon_fee) if amazon_fee and amazon_fee != '' else 0
        supplier_shipping = float(supplier_shipping) if supplier_shipping and supplier_shipping != '' else 0
        customer_shipping = float(customer_shipping) if customer_shipping and customer_shipping != '' else 0
        supplier_tax = float(supplier_tax) if supplier_tax and supplier_tax != '' and supplier_tax != 'None' else 0
        
        # Calcula profit, margin e roi
        profit = (
            amazon_price - 
            amazon_fee - 
            (supplier_price * quantity_sold) - 
            (supplier_tax * quantity_sold) - 
            supplier_shipping - 
            customer_shipping
        )
        
        margin = None
        if amazon_price > 0:
            margin = (profit / amazon_price) * 100
        
        roi = None
        cost = (
            (supplier_price * quantity_sold) + 
            (supplier_tax * quantity_sold) + 
            supplier_shipping + 
            customer_shipping
        )
        if cost > 0:
            roi = (profit / cost) * 100
        
        if apply:
            # Constrói a query SQL
            query = f"""
            UPDATE orders
            SET 
                profit = {profit},
                margin = {margin if margin is not None else 'NULL'},
                roi = {roi if roi is not None else 'NULL'}
            WHERE 
                order_item_id = {order_item_id}
            """
            
            # Executa a query via MCP
            import subprocess
            cmd = [
                "python3", "-c",
                f"from cascade_functions import mcp1_execute_sql; print(mcp1_execute_sql(project_id='{project_id}', query=\"\"\"{query}\"\"\"))"
            ]
            
            logger.info(f"Executando query para atualizar ordem {order_item_id}...")
            result = subprocess.run(cmd, capture_output=True, text=True)
            
            if result.returncode == 0:
                logger.info(f"Ordem {order_item_id} atualizada com sucesso.")
                logger.info(f"profit: {profit}, margin: {margin}, roi: {roi}")
                return True
            else:
                logger.error(f"Erro ao atualizar ordem {order_item_id}: {result.stderr}")
                return False
        else:
            logger.info(f"Simulação: Ordem {order_item_id} seria atualizada.")
            logger.info(f"profit: {profit}, margin: {margin}, roi: {roi}")
            return True
    except Exception as e:
        logger.error(f"Erro ao processar ordem {order_item_id}: {e}")
        return False

def update_orders_via_mcp(data, project_id, batch_size=10, apply=False):
    """
    Atualiza múltiplas ordens via MCP (Supabase).
    
    Args:
        data: Lista de dicionários com os dados das ordens
        project_id: ID do projeto Supabase
        batch_size: Tamanho do lote para processamento
        apply: Se True, aplica as atualizações
        
    Returns:
        Número de ordens atualizadas com sucesso
    """
    success_count = 0
    error_count = 0
    
    try:
        total_orders = len(data)
        logger.info(f"Iniciando atualização de {total_orders} ordens...")
        
        # Processa as ordens em lotes
        for i in range(0, total_orders, batch_size):
            batch = data[i:i+batch_size]
            logger.info(f"Processando lote {i//batch_size + 1}/{(total_orders + batch_size - 1)//batch_size}...")
            
            for order in batch:
                order_item_id = order.get('order_item_id', '')
                supplier_price = order.get('supplier_price', '')
                quantity_sold = order.get('quantity_sold', '')
                amazon_price = order.get('amazon_price', '')
                amazon_fee = order.get('amazon_fee', '')
                supplier_shipping = order.get('supplier_shipping', '')
                customer_shipping = order.get('customer_shipping', '')
                supplier_tax = order.get('supplier_tax', '')
                
                success = update_order_via_mcp(
                    order_item_id, 
                    supplier_price, 
                    quantity_sold, 
                    amazon_price, 
                    amazon_fee, 
                    supplier_shipping, 
                    customer_shipping, 
                    supplier_tax, 
                    project_id, 
                    apply
                )
                
                if success:
                    success_count += 1
                else:
                    error_count += 1
            
            # Pausa entre lotes para evitar sobrecarga
            if i + batch_size < total_orders:
                logger.info(f"Pausa de 2 segundos entre lotes...")
                time.sleep(2)
        
        logger.info(f"Atualização concluída. {success_count} ordens atualizadas com sucesso, {error_count} erros.")
        return success_count
    except Exception as e:
        logger.error(f"Erro durante o processo de atualização: {e}")
        return success_count

def main():
    """Função principal do script."""
    parser = argparse.ArgumentParser(description='Atualiza os valores de profit, margin e roi via MCP (Supabase).')
    parser.add_argument('--csv-file', type=str, default='supplier_orders_data.csv', help='Caminho para o arquivo CSV')
    parser.add_argument('--project-id', type=str, default='bvbnofnnbfdlnpuswlgy', help='ID do projeto Supabase')
    parser.add_argument('--batch-size', type=int, default=10, help='Tamanho do lote para processamento')
    parser.add_argument('--apply', action='store_true', help='Aplica as atualizações. Se não especificado, apenas simula.')
    args = parser.parse_args()
    
    logger.info("Iniciando atualização de ordens via MCP (Supabase)...")
    logger.info(f"Arquivo CSV: {args.csv_file}")
    logger.info(f"ID do projeto: {args.project_id}")
    logger.info(f"Tamanho do lote: {args.batch_size}")
    logger.info(f"Modo: {'Aplicar atualizações' if args.apply else 'Apenas simular'}")
    
    # Lê os dados do arquivo CSV
    data = read_csv_data(args.csv_file)
    
    if not data:
        logger.error("Nenhum dado encontrado no arquivo CSV.")
        return
    
    # Atualiza as ordens via MCP
    updated_count = update_orders_via_mcp(data, args.project_id, args.batch_size, args.apply)
    
    logger.info(f"Total de {updated_count} ordens atualizadas via MCP.")
    logger.info("Processo concluído.")

if __name__ == "__main__":
    main()
