/**
 * dataDiagnostic.js
 * Ferramenta de diagnóstico e reparo para problemas de integridade de dados
 */

import { 
  deliveries, 
  gasEntries, 
  saveDeliveries, 
  saveGasEntries,
  updateTotals,
  forceSyncData
} from './data.js';
import { validateDatabaseIntegrity, getErrorMessages } from './dataValidator.js';
import { showToast } from './utils.js';

/**
 * Realiza um diagnóstico completo dos dados e exibe os resultados
 * @param {boolean} autoRepair - Se deve tentar reparar automaticamente os problemas
 * @returns {Object} Resultado do diagnóstico
 */
export function runDiagnostic(autoRepair = false) {
  console.time('Diagnóstico de Dados');
  
  // Executar verificação de integridade
  const result = validateDatabaseIntegrity();
  const diagnosticReport = analyzeDiagnosticResults(result);
  
  // Exibir resultados no console de forma organizada
  console.group('Relatório de Diagnóstico de Dados');
  console.log(`Status: ${result.isValid ? 'ÍNTEGRO ✅' : 'COM PROBLEMAS ❌'}`);
  console.log(`Timestamp: ${new Date(result.timestamp).toLocaleString()}`);
  
  // Relatório de entregas
  console.group('Entregas');
  console.log(`Total: ${deliveries.length}`);
  console.log(`Válidas: ${result.deliveries.validItems.length}`);
  console.log(`Inválidas: ${result.deliveries.invalidItems.length}`);
  
  if (result.deliveries.invalidItems.length > 0) {
    console.group('Problemas encontrados');
    diagnosticReport.deliveryIssues.forEach((issue, index) => {
      console.log(`🔍 Problema #${index + 1}: ${issue.message} (${issue.count} ocorrências)`);
    });
    console.groupEnd();
  }
  console.groupEnd();
  
  // Relatório de abastecimentos
  console.group('Abastecimentos');
  console.log(`Total: ${gasEntries.length}`);
  console.log(`Válidos: ${result.gasEntries.validItems.length}`);
  console.log(`Inválidos: ${result.gasEntries.invalidItems.length}`);
  
  if (result.gasEntries.invalidItems.length > 0) {
    console.group('Problemas encontrados');
    diagnosticReport.gasIssues.forEach((issue, index) => {
      console.log(`🔍 Problema #${index + 1}: ${issue.message} (${issue.count} ocorrências)`);
    });
    console.groupEnd();
  }
  console.groupEnd();
  
  console.groupEnd();
  console.timeEnd('Diagnóstico de Dados');
  
  // Mostrar toast resumido
  if (!result.isValid) {
    const totalIssues = result.deliveries.invalidItems.length + result.gasEntries.invalidItems.length;
    
    if (autoRepair) {
      // Tentar reparar automaticamente
      const repairResult = repairData(result);
      showToast(`Encontrados ${totalIssues} problemas. Reparo automático: ${repairResult.success ? 'Sucesso' : 'Falha'} (${repairResult.fixed}/${totalIssues} corrigidos)`, 'warning');
    } else {
      showToast(`Diagnóstico encontrou ${totalIssues} problemas de integridade. Verifique o console para detalhes.`, 'error');
    }
  } else {
    showToast('Dados verificados. Nenhum problema encontrado.', 'success');
  }
  
  return {
    result,
    report: diagnosticReport
  };
}

/**
 * Analisa os resultados do diagnóstico para um relatório mais amigável
 * @param {Object} result - Resultado da validação
 * @returns {Object} Relatório de problemas organizado
 */
function analyzeDiagnosticResults(result) {
  const report = {
    deliveryIssues: [],
    gasIssues: []
  };
  
  // Organizar problemas comuns nas entregas
  const deliveryErrorMap = new Map();
  result.deliveries.invalidItems.forEach(item => {
    item.errors.forEach(error => {
      const key = `${error.field}:${error.message}`;
      if (!deliveryErrorMap.has(key)) {
        deliveryErrorMap.set(key, {
          field: error.field,
          message: error.message,
          items: [],
          count: 0
        });
      }
      
      deliveryErrorMap.get(key).items.push(item.item);
      deliveryErrorMap.get(key).count++;
    });
  });
  
  // Converter mapa em array
  report.deliveryIssues = Array.from(deliveryErrorMap.values());
  
  // Organizar problemas comuns nos abastecimentos
  const gasErrorMap = new Map();
  result.gasEntries.invalidItems.forEach(item => {
    item.errors.forEach(error => {
      const key = `${error.field}:${error.message}`;
      if (!gasErrorMap.has(key)) {
        gasErrorMap.set(key, {
          field: error.field,
          message: error.message,
          items: [],
          count: 0
        });
      }
      
      gasErrorMap.get(key).items.push(item.item);
      gasErrorMap.get(key).count++;
    });
  });
  
  // Converter mapa em array
  report.gasIssues = Array.from(gasErrorMap.values());
  
  return report;
}

/**
 * Tenta reparar automaticamente os problemas de integridade
 * @param {Object} diagnosticResult - Resultado do diagnóstico
 * @returns {Object} Resultado do reparo
 */
export function repairData(diagnosticResult) {
  console.time('Reparo de Dados');
  
  const repairResult = {
    success: false,
    fixed: 0,
    total: 0,
    deliveryFixed: 0,
    gasFixed: 0,
    unrepaired: []
  };
  
  // Contabilizar total de problemas
  repairResult.total = diagnosticResult.deliveries.invalidItems.length + 
                      diagnosticResult.gasEntries.invalidItems.length;
  
  // Reparar entregas
  diagnosticResult.deliveries.invalidItems.forEach(item => {
    const index = deliveries.findIndex(d => d.id === item.item.id);
    if (index !== -1) {
      let fixed = false;
      
      // Verificar cada tipo de erro e tentar reparar
      item.errors.forEach(error => {
        switch (error.field) {
          case 'status':
            deliveries[index].status = parseFloat(deliveries[index].fee) > 0 ? 'completed' : 'pending';
            fixed = true;
            break;
          
          case 'id':
            if (!deliveries[index].id) {
              deliveries[index].id = `repair_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
              fixed = true;
            }
            break;
            
          case 'date':
            // Corrigir data se estiver em formato inválido
            if (deliveries[index].date) {
              try {
                const dateObj = new Date(deliveries[index].date);
                if (!isNaN(dateObj.getTime())) {
                  deliveries[index].date = dateObj.toISOString().split('T')[0];
                  fixed = true;
                }
              } catch (e) {
                // Não foi possível reparar a data
              }
            }
            break;
            
          case 'fee':
            // Garantir que fee é um número
            if (deliveries[index].fee !== undefined) {
              const fee = parseFloat(deliveries[index].fee);
              if (!isNaN(fee)) {
                deliveries[index].fee = fee;
                fixed = true;
              } else {
                deliveries[index].fee = 0;
                fixed = true;
              }
            }
            break;
            
          case 'orderNumber':
            // Se o número do pedido estiver vazio, criar um sintético
            if (!deliveries[index].orderNumber) {
              deliveries[index].orderNumber = `REPARO_${index + 1}`;
              fixed = true;
            }
            break;
        }
      });
      
      if (fixed) {
        repairResult.fixed++;
        repairResult.deliveryFixed++;
      } else {
        repairResult.unrepaired.push({
          type: 'delivery',
          id: item.item.id,
          errors: item.errors
        });
      }
    }
  });
  
  // Reparar abastecimentos
  diagnosticResult.gasEntries.invalidItems.forEach(item => {
    const index = gasEntries.findIndex(g => g.id === item.item.id);
    if (index !== -1) {
      let fixed = false;
      
      // Verificar cada tipo de erro e tentar reparar
      item.errors.forEach(error => {
        switch (error.field) {
          case 'id':
            if (!gasEntries[index].id) {
              gasEntries[index].id = `repair_gas_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
              fixed = true;
            }
            break;
            
          case 'date':
            // Corrigir data se estiver em formato inválido
            if (gasEntries[index].date) {
              try {
                const dateObj = new Date(gasEntries[index].date);
                if (!isNaN(dateObj.getTime())) {
                  gasEntries[index].date = dateObj.toISOString().split('T')[0];
                  fixed = true;
                }
              } catch (e) {
                // Não foi possível reparar a data
              }
            }
            break;
            
          case 'amount':
            // Garantir que amount é um número positivo
            if (gasEntries[index].amount !== undefined) {
              const amount = parseFloat(gasEntries[index].amount);
              if (!isNaN(amount) && amount > 0) {
                gasEntries[index].amount = amount;
                fixed = true;
              } else if (!isNaN(amount) && amount <= 0) {
                gasEntries[index].amount = 0.01;
                fixed = true;
              }
            }
            break;
        }
      });
      
      if (fixed) {
        repairResult.fixed++;
        repairResult.gasFixed++;
      } else {
        repairResult.unrepaired.push({
          type: 'gasEntry',
          id: item.item.id,
          errors: item.errors
        });
      }
    }
  });
  
  // Salvar alterações
  if (repairResult.deliveryFixed > 0) {
    saveDeliveries();
  }
  
  if (repairResult.gasFixed > 0) {
    saveGasEntries();
  }
  
  // Forçar sincronização de dados
  if (repairResult.fixed > 0) {
    updateTotals();
    forceSyncData();
  }
  
  repairResult.success = repairResult.fixed > 0;
  
  console.timeEnd('Reparo de Dados');
  console.log('Resultado do reparo:', repairResult);
  
  return repairResult;
}

/**
 * Verifica campos duplicados entre entregas (datas e números de pedido)
 * @returns {Object} Relatório de duplicatas
 */
export function checkDuplicates() {
  const report = {
    sameOrderNumberAndDate: [],
    sameDate: {},
    total: 0
  };
  
  // Verificar pedidos com mesmo número e data
  for (let i = 0; i < deliveries.length; i++) {
    for (let j = i + 1; j < deliveries.length; j++) {
      if (deliveries[i].orderNumber === deliveries[j].orderNumber && 
          deliveries[i].date === deliveries[j].date) {
        report.sameOrderNumberAndDate.push({
          first: deliveries[i],
          second: deliveries[j],
          suggestion: 'Alterar o número de pedido ou a data de uma das entregas'
        });
        report.total++;
      }
    }
  }
  
  // Agrupar por data para análise
  deliveries.forEach(delivery => {
    if (!report.sameDate[delivery.date]) {
      report.sameDate[delivery.date] = [];
    }
    report.sameDate[delivery.date].push(delivery);
  });
  
  // Limpar datas com apenas uma entrega
  Object.keys(report.sameDate).forEach(date => {
    if (report.sameDate[date].length <= 1) {
      delete report.sameDate[date];
    }
  });
  
  return report;
}

/**
 * Cria e exibe um modal de diagnóstico
 */
export function showDiagnosticModal() {
  // Executar diagnóstico
  const diagnostic = runDiagnostic(false);
  
  // Criar modal se não existir
  let modal = document.getElementById('diagnosticModal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'diagnosticModal';
    modal.className = 'modal-overlay';
    document.body.appendChild(modal);
  }
  
  // Construir o conteúdo do modal
  const isValid = diagnostic.result.isValid;
  const totalIssues = diagnostic.result.deliveries.invalidItems.length + diagnostic.result.gasEntries.invalidItems.length;
  
  // Conteúdo HTML para o modal
  modal.innerHTML = `
    <div class="diagnostic-modal">
      <h2>Diagnóstico de Integridade de Dados</h2>
      
      <div class="diagnostic-summary ${isValid ? 'valid' : 'invalid'}">
        <div class="diagnostic-status">
          <span class="status-icon">${isValid ? '✅' : '❌'}</span>
          <span class="status-text">${isValid ? 'Dados Íntegros' : 'Problemas Encontrados'}</span>
        </div>
        <div class="diagnostic-counts">
          <div class="count-item">
            <span class="count-value">${deliveries.length}</span>
            <span class="count-label">Entregas Totais</span>
          </div>
          <div class="count-item">
            <span class="count-value">${gasEntries.length}</span>
            <span class="count-label">Abastecimentos Totais</span>
          </div>
          <div class="count-item ${totalIssues > 0 ? 'invalid' : ''}">
            <span class="count-value">${totalIssues}</span>
            <span class="count-label">Problemas</span>
          </div>
        </div>
      </div>
      
      ${totalIssues > 0 ? `
        <div class="diagnostic-issues">
          <h3>Problemas Encontrados</h3>
          
          ${diagnostic.report.deliveryIssues.length > 0 ? `
            <div class="issue-group">
              <h4>Problemas em Entregas</h4>
              <ul class="issue-list">
                ${diagnostic.report.deliveryIssues.map(issue => `
                  <li class="issue-item">
                    <div class="issue-header">
                      <span class="issue-field">${issue.field}</span>
                      <span class="issue-count">${issue.count} ocorrência${issue.count !== 1 ? 's' : ''}</span>
                    </div>
                    <div class="issue-message">${issue.message}</div>
                  </li>
                `).join('')}
              </ul>
            </div>
          ` : ''}
          
          ${diagnostic.report.gasIssues.length > 0 ? `
            <div class="issue-group">
              <h4>Problemas em Abastecimentos</h4>
              <ul class="issue-list">
                ${diagnostic.report.gasIssues.map(issue => `
                  <li class="issue-item">
                    <div class="issue-header">
                      <span class="issue-field">${issue.field}</span>
                      <span class="issue-count">${issue.count} ocorrência${issue.count !== 1 ? 's' : ''}</span>
                    </div>
                    <div class="issue-message">${issue.message}</div>
                  </li>
                `).join('')}
              </ul>
            </div>
          ` : ''}
          
          <div class="repair-actions">
            <button id="autoRepairBtn" class="button primary">Reparar Automaticamente</button>
            <p class="repair-note">O reparo automático tentará corrigir os problemas mais comuns. É recomendado fazer um backup antes.</p>
          </div>
        </div>
      ` : `
        <div class="diagnostic-valid">
          <p>Todos os dados foram verificados e estão íntegros.</p>
        </div>
      `}
      
      <div class="modal-actions">
        <button id="closeDiagnosticBtn" class="button outline">Fechar</button>
        <button id="backupBeforeRepairBtn" class="button outline">Fazer Backup</button>
      </div>
    </div>
  `;
  
  // Exibir o modal
  modal.style.display = 'flex';
  
  // Adicionar event listeners
  document.getElementById('closeDiagnosticBtn').addEventListener('click', () => {
    modal.style.display = 'none';
  });
  
  document.getElementById('backupBeforeRepairBtn').addEventListener('click', () => {
    // Importar dinamicamente o módulo de backup para evitar dependência circular
    import('./export.js').then(exportModule => {
      exportModule.backupData();
      showToast('Backup criado com sucesso', 'success');
    });
  });
  
  // Adicionar listener para reparo apenas se houver problemas
  if (totalIssues > 0) {
    document.getElementById('autoRepairBtn').addEventListener('click', () => {
      // Executar reparo
      const repairResult = repairData(diagnostic.result);
      
      // Atualizar modal com o resultado
      if (repairResult.success) {
        showToast(`Reparo: ${repairResult.fixed}/${totalIssues} problemas corrigidos`, 'success');
        
        // Recarregar diagnóstico após o reparo
        setTimeout(() => {
          modal.style.display = 'none';
          showDiagnosticModal();
        }, 1500);
      } else {
        showToast('Não foi possível reparar os problemas automaticamente', 'error');
      }
    });
  }
  
  // Evitar que cliques no conteúdo do modal fechem o modal
  modal.querySelector('.diagnostic-modal').addEventListener('click', event => {
    event.stopPropagation();
  });
  
  // Fechar o modal ao clicar fora
  modal.addEventListener('click', () => {
    modal.style.display = 'none';
  });
}

// Exportar função utilitária
export function removeDataItem(itemType, itemId) {
  if (itemType === 'delivery') {
    const index = deliveries.findIndex(d => d.id === itemId);
    if (index !== -1) {
      deliveries.splice(index, 1);
      saveDeliveries();
      return true;
    }
  } else if (itemType === 'gasEntry') {
    const index = gasEntries.findIndex(g => g.id === itemId);
    if (index !== -1) {
      gasEntries.splice(index, 1);
      saveGasEntries();
      return true;
    }
  }
  return false;
} 