#!/usr/bin/env python3
"""
Script para extrair apenas os supplier_order_id do CSV e salvá-los em um arquivo separado.
"""

import csv
import logging
import sys

# Configuração de logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler("extract_supplier_order_ids.log"),
        logging.StreamHandler(sys.stdout)
    ]
)
logger = logging.getLogger(__name__)

def extract_supplier_order_ids(input_csv, output_file):
    """
    Extrai apenas os supplier_order_id do CSV e salva em um arquivo separado.
    
    Args:
        input_csv: Caminho para o arquivo CSV de entrada
        output_file: Caminho para o arquivo de saída
    """
    try:
        supplier_order_ids = []
        
        # Lê o arquivo CSV
        with open(input_csv, 'r') as f:
            reader = csv.DictReader(f)
            for row in reader:
                supplier_order_id = row.get('supplier_order_id', '')
                if supplier_order_id:
                    supplier_order_ids.append(supplier_order_id)
        
        # Remove duplicatas e ordena
        supplier_order_ids = sorted(list(set(supplier_order_ids)))
        
        # Salva os supplier_order_id em um arquivo
        with open(output_file, 'w') as f:
            for supplier_order_id in supplier_order_ids:
                f.write(f"{supplier_order_id}\n")
        
        logger.info(f"Extraídos {len(supplier_order_ids)} supplier_order_id únicos.")
        logger.info(f"Dados salvos com sucesso em {output_file}.")
        
        return supplier_order_ids
    except Exception as e:
        logger.error(f"Erro ao extrair supplier_order_id: {e}")
        return []

def main():
    """Função principal do script."""
    import argparse
    
    parser = argparse.ArgumentParser(description='Extrai apenas os supplier_order_id do CSV e salva em um arquivo separado.')
    parser.add_argument('--input-csv', type=str, default='supplier_orders_data.csv', help='Caminho para o arquivo CSV de entrada')
    parser.add_argument('--output-file', type=str, default='supplier_order_ids.txt', help='Caminho para o arquivo de saída')
    args = parser.parse_args()
    
    logger.info("Iniciando extração de supplier_order_id...")
    logger.info(f"Arquivo CSV de entrada: {args.input_csv}")
    logger.info(f"Arquivo de saída: {args.output_file}")
    
    # Extrai os supplier_order_id
    supplier_order_ids = extract_supplier_order_ids(args.input_csv, args.output_file)
    
    logger.info("Processo concluído.")

if __name__ == "__main__":
    main()
