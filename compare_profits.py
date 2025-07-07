import os
import csv
import time
import sys
from supabase import create_client
from decimal import Decimal, ROUND_HALF_UP

# Supabase project credentials
SUPABASE_URL = "https://bvbnofnnbfdlnpuswlgy.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ2Ym5vZm5uYmZkbG5wdXN3bGd5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzI3MzY0NDcsImV4cCI6MjA0ODMxMjQ0N30.-t3fItCTWGLZPN95drtDYgN0FodXsh5bSV6a3jgVPmU"

# Initialize Supabase client
supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

# Helper function to safely convert to Decimal, defaulting to 0
def to_decimal(value, default=Decimal('0.00')):
    if value is None:
        return default
    try:
        return Decimal(str(value))
    except:
        return default

# Function to calculate profit based on your formula
def calculate_profit(order):
    amazon_price = to_decimal(order.get('amazon_price'))
    supplier_price = to_decimal(order.get('supplier_price'))
    quantity_sold = to_decimal(order.get('quantity_sold'), default=Decimal('0'))
    amazon_fee = to_decimal(order.get('amazon_fee'))
    supplier_tax = to_decimal(order.get('supplier_tax'))
    supplier_shipping = to_decimal(order.get('supplier_shipping'))
    customer_shipping = to_decimal(order.get('customer_shipping'))
    order_status = order.get('order_status', '').lower()
    
    # Special case for canceled orders
    if order_status == 'canceled':
        return Decimal('0.00')
    
    # Special case for refunded orders
    # Profit = -(20% do Amazon Fee + Customer Shipping)
    if order_status == 'refunded':
        refunded_profit = -((amazon_fee * Decimal('0.2')) + customer_shipping)
        return refunded_profit.quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)
    
    # Regular calculation for other statuses
    # Formula: amazon_price - (supplier_price * quantity_sold) - amazon_fee - (supplier_tax * quantity_sold) - supplier_shipping - customer_shipping
    # Os valores de shipping são valores totais inseridos manualmente e não devem ser multiplicados pela quantidade
    calculated_profit = (
        amazon_price -
        (supplier_price * quantity_sold) -
        amazon_fee -
        (supplier_tax * quantity_sold) -
        supplier_shipping -
        customer_shipping
    )
    # Round to 2 decimal places
    return calculated_profit.quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)

# Function to calculate margin based on profit and amazon_price
def calculate_margin(profit, amazon_price):
    # Helper to safely convert to Decimal, defaulting to 0
    def to_decimal(value, default=Decimal('0.00')):
        if value is None:
            return default
        try:
            return Decimal(str(value))
        except:
            return default
            
    profit_decimal = to_decimal(profit)
    amazon_price_decimal = to_decimal(amazon_price)
    
    if amazon_price_decimal <= 0:
        return None
        
    margin = (profit_decimal / amazon_price_decimal) * 100
    return margin.quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)

# Function to calculate ROI based on profit and supplier costs
def calculate_roi(profit, supplier_price, quantity_sold, supplier_tax, supplier_shipping):
    # Helper to safely convert to Decimal, defaulting to 0
    def to_decimal(value, default=Decimal('0.00')):
        if value is None:
            return default
        try:
            return Decimal(str(value))
        except:
            return default
            
    profit_decimal = to_decimal(profit)
    supplier_price_decimal = to_decimal(supplier_price)
    quantity_sold_decimal = to_decimal(quantity_sold, default=Decimal('0'))
    supplier_tax_decimal = to_decimal(supplier_tax)
    supplier_shipping_decimal = to_decimal(supplier_shipping)
    
    # Os valores de shipping são valores totais inseridos manualmente e não devem ser multiplicados pela quantidade
    total_cost = (
        supplier_price_decimal * quantity_sold_decimal +
        supplier_tax_decimal * quantity_sold_decimal +
        supplier_shipping_decimal
    )
    
    if total_cost <= 0:
        return None
        
    roi = (profit_decimal / total_cost) * 100
    return roi.quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)

def fetch_compare_and_update_profits(update_database=False, batch_size=100):
    """Função principal para comparar e atualizar os valores de profit, margin e ROI.
    
    Args:
        update_database (bool): Se True, atualiza os registros no banco de dados.
        batch_size (int): Número de registros para processar em cada lote antes de salvar o CSV.
    """
    print('='*80)
    print(f'Iniciando processo com update_database={update_database}')
    print('='*80)
    print('Buscando pedidos do Supabase...')
    
    # Arquivo CSV para salvar os resultados
    csv_file_path = os.path.join(os.getcwd(), 'profit_comparison.csv')
    
    # Cabeçalho do CSV
    header = [
        'order_id', 'order_item_id', 'existing_profit', 'calculated_profit', 'difference',
        'existing_margin', 'calculated_margin', 'existing_roi', 'calculated_roi'
    ]
    
    # Criar o arquivo CSV e escrever o cabeçalho
    with open(csv_file_path, 'w', newline='', encoding='utf-8') as csvfile:
        writer = csv.DictWriter(csvfile, fieldnames=header)
        writer.writeheader()
    
    all_orders = []
    count_differences = 0
    updated_count = 0
    total_count = 0
    
    try:
        # Implementar paginação para buscar todos os registros
        page_size = 1000
        start = 0
        
        while True:
            print(f"Buscando registros {start} a {start + page_size - 1}...")
            response = supabase.table('orders').select("*").range(start, start + page_size - 1).execute()
            
            if hasattr(response, 'error') and response.error:
                print(f"Erro ao buscar pedidos: {response.error}")
                return
            
            current_batch = response.data
            
            if not current_batch or len(current_batch) == 0:
                break  # Não há mais registros para buscar
                
            batch_differences = 0
            batch_updates = 0
            comparison_results = []
            
            # Processar cada pedido do lote atual
            for order in current_batch:
                total_count += 1
                order_item_id = order.get('order_item_id')  # Chave primária para atualizações
                
                # Calcular o profit correto
                existing_profit = to_decimal(order.get('profit'))
                calculated_profit = calculate_profit(order)
                difference = (calculated_profit - existing_profit).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)

                # Calcular margin e ROI baseados no profit correto
                calculated_margin = calculate_margin(calculated_profit, order.get('amazon_price'))
                calculated_roi = calculate_roi(
                    calculated_profit, 
                    order.get('supplier_price'), 
                    order.get('quantity_sold'), 
                    order.get('supplier_tax'), 
                    order.get('supplier_shipping')
                )

                # Incluir apenas registros com diferença significativa
                if abs(difference) > Decimal('0.01'):
                    batch_differences += 1
                    count_differences += 1
                    
                    # Adicionar ao resultado para o CSV
                    comparison_results.append({
                        'order_id': order.get('order_id'),
                        'order_item_id': order_item_id,
                        'existing_profit': str(existing_profit),
                        'calculated_profit': str(calculated_profit),
                        'difference': str(difference),
                        'existing_margin': str(order.get('margin')),
                        'calculated_margin': str(calculated_margin) if calculated_margin is not None else 'NULL',
                        'existing_roi': str(order.get('roi')),
                        'calculated_roi': str(calculated_roi) if calculated_roi is not None else 'NULL'
                    })
                    
                    # Atualizar o banco de dados se solicitado
                    if update_database and order_item_id is not None:
                        try:
                            update_data = {
                                'profit': float(calculated_profit),
                                'margin': float(calculated_margin) if calculated_margin is not None else None,
                                'roi': float(calculated_roi) if calculated_roi is not None else None
                            }
                            
                            response = supabase.table('orders')\
                                .update(update_data)\
                                .eq('order_item_id', order_item_id)\
                                .execute()
                                
                            if not hasattr(response, 'error') or not response.error:
                                batch_updates += 1
                                updated_count += 1
                                
                            # Pequeno delay para evitar sobrecarregar a API
                            time.sleep(0.05)
                            
                        except Exception as update_error:
                            print(f"Erro ao atualizar pedido {order_item_id}: {update_error}")
            
            # Adicionar resultados ao CSV
            if comparison_results:
                with open(csv_file_path, 'a', newline='', encoding='utf-8') as csvfile:
                    writer = csv.DictWriter(csvfile, fieldnames=header)
                    writer.writerows(comparison_results)
            
            # Mostrar progresso do lote atual
            print(f"Lote: {batch_differences} diferenças encontradas, {batch_updates if update_database else 0} registros atualizados")
            print(f"Total até agora: {count_differences} diferenças em {total_count} registros ({count_differences/total_count*100:.2f}%)")
            if update_database:
                print(f"Total de atualizações: {updated_count} registros")
            
            # Verificar se é o último lote
            if len(current_batch) < page_size:
                break
                
            start += page_size
            
            # Dar ao usuário a chance de interromper o processo
            print("Pressione Ctrl+C para interromper o processo ou Enter para continuar...")
            try:
                input()
            except KeyboardInterrupt:
                print("\nProcesso interrompido pelo usuário.")
                break
            
        print('='*80)
        print(f"Processo concluído! Resultados salvos em: {csv_file_path}")
        print(f"Encontradas {count_differences} diferenças em {total_count} registros ({count_differences/total_count*100:.2f}%)")
        if update_database:
            print(f"Atualizados {updated_count} registros no banco de dados")
        print('='*80)

    except KeyboardInterrupt:
        print("\nProcesso interrompido pelo usuário.")
    except Exception as e:
        print(f"Ocorreu um erro inesperado: {e}")
        import traceback
        traceback.print_exc()

        if not all_orders:
            print('No orders found to process.')
            return

        comparison_results = []
        count_differences = 0
        updated_count = 0
        
        for order in all_orders:
            order_item_id = order.get('order_item_id')  # Primary key for updates
            existing_profit_str = order.get('profit', '0')
            
            try:
                existing_profit = Decimal(str(existing_profit_str if existing_profit_str is not None else '0.00'))
            except:
                existing_profit = Decimal('0.00')
            
            existing_profit = existing_profit.quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)
            
            calculated_profit = calculate_profit(order)
            difference = (calculated_profit - existing_profit).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)

            # Calculate new margin and ROI based on the corrected profit
            calculated_margin = calculate_margin(calculated_profit, order.get('amazon_price'))
            calculated_roi = calculate_roi(
                calculated_profit, 
                order.get('supplier_price'), 
                order.get('quantity_sold'), 
                order.get('supplier_tax'), 
                order.get('supplier_shipping')
            )

            # Only include records with a significant difference
            if abs(difference) > Decimal('0.01'):
                count_differences += 1
                comparison_results.append({
                    'order_id': order.get('order_id'),
                    'order_item_id': order_item_id,
                    'existing_profit': str(existing_profit),
                    'calculated_profit': str(calculated_profit),
                    'difference': str(difference),
                    'existing_margin': str(order.get('margin')),
                    'calculated_margin': str(calculated_margin) if calculated_margin is not None else 'NULL',
                    'existing_roi': str(order.get('roi')),
                    'calculated_roi': str(calculated_roi) if calculated_roi is not None else 'NULL'
                })
                
                # Update the database if requested
                if update_database and order_item_id is not None:
                    try:
                        print(f"\nPreparing to update order_item_id={order_item_id}")
                        update_data = {
                            'profit': float(calculated_profit),
                            'margin': float(calculated_margin) if calculated_margin is not None else None,
                            'roi': float(calculated_roi) if calculated_roi is not None else None
                        }
                        print(f"Update data: {update_data}")
                        
                        print(f"Making Supabase API call to update order_item_id={order_item_id}")
                        response = supabase.table('orders')\
                            .update(update_data)\
                            .eq('order_item_id', order_item_id)\
                            .execute()
                        print(f"API call for update completed")
                            
                        if hasattr(response, 'error') and response.error:
                            print(f"Error updating order {order_item_id}: {response.error}")
                        else:
                            updated_count += 1
                            # Print progress every 10 updates
                            if updated_count % 10 == 0:
                                print(f"Updated {updated_count} records so far...")
                            elif updated_count <= 5:
                                # Print first few updates for debugging
                                print(f"Successfully updated order_item_id={order_item_id}")
                                
                        # Add a small delay to avoid overwhelming the API
                        print(f"Sleeping for 0.05 seconds to avoid API rate limits")
                        time.sleep(0.05)
                        
                    except Exception as update_error:
                        print(f"Exception during update of order_item_id={order_item_id}: {update_error}")
                        import traceback
                        traceback.print_exc()

        # Define CSV file path
        csv_file_path = os.path.join(os.getcwd(), 'profit_comparison.csv')
        
        header = [
            'order_id', 'order_item_id', 'existing_profit', 'calculated_profit', 'difference',
            'existing_margin', 'calculated_margin', 'existing_roi', 'calculated_roi'
        ]

        with open(csv_file_path, 'w', newline='', encoding='utf-8') as csvfile:
            writer = csv.DictWriter(csvfile, fieldnames=header)
            writer.writeheader()
            writer.writerows(comparison_results)

        print(f"CSV file generated successfully at: {csv_file_path}")
        print(f"Found {count_differences} orders with profit calculation differences out of {len(all_orders)} total orders")
        print(f"Percentage of orders with incorrect profit: {(count_differences / len(all_orders) * 100):.2f}%")
        
        if update_database:
            print(f"Updated {updated_count} records in the database with corrected values")

# Função principal para comparar e atualizar os valores de profit, margin e ROI na tabela orders
# Esta função foi removida para simplificar o script

if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(description='Compare and optionally update profit calculations in the orders table.')
    parser.add_argument('--update', action='store_true', help='Update the database with corrected profit, margin, and ROI values')
    parser.add_argument('--batch-size', type=int, default=100, help='Number of records to process in each batch')
    parser.add_argument('--no-pause', action='store_true', help='Run without pausing between batches')
    
    args = parser.parse_args()
    
    if args.update:
        print("\n" + "="*80)
        print("ATENÇÃO: Este script irá atualizar os valores de profit, margin e ROI no banco de dados.")
        print("Isso afetará os cálculos financeiros e relatórios do sistema.")
        print("="*80 + "\n")
        
        confirm = input("Tem certeza que deseja prosseguir com a atualização? (sim/não): ")
        if confirm.lower() in ['sim', 's', 'yes', 'y']:
            print("\nIniciando atualização...\n")
            fetch_compare_and_update_profits(update_database=True, batch_size=args.batch_size)
        else:
            print("\nAtualização cancelada.")
    else:
        print("Executando apenas em modo de comparação (sem atualizar o banco de dados).")
        fetch_compare_and_update_profits(update_database=False, batch_size=args.batch_size)
