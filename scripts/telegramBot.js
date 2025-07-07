const axios = require('axios');

class TelegramBot {
  constructor(token, chatId) {
    this.token = token;
    this.chatId = chatId;
    this.baseUrl = `https://api.telegram.org/bot${token}`;
  }

  async sendMessage(text) {
    try {
      const response = await axios.post(`${this.baseUrl}/sendMessage`, {
        chat_id: this.chatId,
        text: text,
        parse_mode: 'HTML'
      });
      return response.data;
    } catch (error) {
      console.error('❌ Erro ao enviar mensagem Telegram:', error.message);
      return null;
    }
  }

  async sendOrderReport(stats) {
    const {
      newOrders = 0,
      updatedOrders = 0,
      totalValue = 0,
      processingTime = 0,
      errors = 0
    } = stats;

    const timestamp = new Date().toLocaleString('pt-BR', {
      timeZone: 'Europe/Madrid',
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });

    let message = `🎯 <b>OALIZO Orders - ${timestamp}</b>\n\n`;
    
    if (newOrders > 0) {
      message += `✅ <b>${newOrders}</b> novas orders\n`;
    }
    
    if (updatedOrders > 0) {
      message += `🔄 <b>${updatedOrders}</b> orders atualizadas\n`;
    }
    
    if (totalValue > 0) {
      message += `💰 <b>R$ ${totalValue.toFixed(2)}</b> em novos pedidos\n`;
    }
    
    message += `⏱️ <b>${processingTime.toFixed(1)}s</b> processamento\n`;
    
    if (errors > 0) {
      message += `🚨 <b>${errors}</b> erros encontrados\n`;
    }

    if (newOrders === 0 && updatedOrders === 0) {
      message += `📊 <i>Nenhuma order nova encontrada</i>\n`;
    }

    return await this.sendMessage(message);
  }

  async sendHealthCheck(stats) {
    const {
      memoryMB = 0,
      uptimeMinutes = 0
    } = stats;

    const message = `💙 <b>Health Check - OALIZO</b>\n\n` +
                   `🧠 Memória: <b>${memoryMB}MB</b>\n` +
                   `⏰ Uptime: <b>${uptimeMinutes} min</b>\n` +
                   `🤖 Scheduler: <i>Funcionando normalmente</i>`;

    return await this.sendMessage(message);
  }

  async sendError(errorMsg) {
    const timestamp = new Date().toLocaleString('pt-BR', {
      timeZone: 'Europe/Madrid'
    });

    const message = `🚨 <b>ERRO - OALIZO</b>\n\n` +
                   `⏰ ${timestamp}\n` +
                   `❌ <code>${errorMsg}</code>`;

    return await this.sendMessage(message);
  }

  // Método para testar o bot
  async test() {
    return await this.sendMessage('🤖 <b>Bot OALIZO ativado!</b>\n\nNotificações de orders Amazon configuradas com sucesso! ✅');
  }
}

module.exports = TelegramBot;
