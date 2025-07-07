-- SQL para consultar o valor total do profit no período de 01/05/2025 a 10/05/2025
SELECT SUM(profit::numeric) as total_profit
FROM orders
WHERE purchase_date >= '2025-05-01' AND purchase_date <= '2025-05-10';
