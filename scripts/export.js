import { deliveries, gasEntries, loadDeliveries, loadGasEntries, updateTotals } from './data.js';
import { formatDate, getCurrentDate, showToast } from './utils.js';
import { generateDeliveryIdentifiers } from './idGenerator.js';
import { optimizeStoredImages, formatImageDisplay } from './imageUtils.js';

// Função para validar dados antes da exportação
function validateExportData(data, type) {
  const errors = [];
  
  data.forEach((item, index) => {
    if (!item.date) {
      errors.push(`${type} #${index + 1}: Data inválida`);
    }
    if (!item.id) {
      errors.push(`${type} #${index + 1}: ID inválido`);
    }
    
    if (type === 'Entrega') {
      if (!item.orderNumber) {
        errors.push(`Entrega #${index + 1}: Número do pedido inválido`);
      }
      if (typeof item.fee !== 'number' && item.fee !== '') {
        errors.push(`Entrega #${index + 1}: Taxa inválida`);
      }
    } else if (type === 'Gasolina') {
      if (typeof item.amount !== 'number' && item.amount !== '') {
        errors.push(`Gasolina #${index + 1}: Valor inválido`);
      }
    }
  });
  
  return errors;
}

// Função para gerar CSV com os dados
export function generateCSV(includeGas = true) {
  // Validar dados antes de exportar
  const deliveryErrors = validateExportData(deliveries, 'Entrega');
  const gasErrors = includeGas ? validateExportData(gasEntries, 'Gasolina') : [];
  
  const allErrors = [...deliveryErrors, ...gasErrors];
  if (allErrors.length > 0) {
    throw new Error(`Erros nos dados:\n${allErrors.join('\n')}`);
  }
  
  const headers = ['Data', 'Tipo', 'ID', 'Número do Pedido', 'Valor Pedido', 'Valor Gasolina', 'Status', 'Imagem'];
  const rows = [];
  
  // Adicionar entregas
  deliveries.forEach(delivery => {
    rows.push([
      formatDate(delivery.date),
      'Entrega',
      delivery.id,
      delivery.orderNumber,
      delivery.fee,
      '',
      delivery.fee ? 'concluido' : 'pendente',
      delivery.image || ''
    ]);
  });
  
  // Adicionar registros de gasolina se includeGas for true
  if (includeGas) {
    gasEntries.forEach(entry => {
      rows.push([
        formatDate(entry.date),
        'Gasolina',
        entry.id,
        '',
        '',
        entry.amount,
        'Pago',
        entry.image || ''
      ]);
    });
  }
  
  // Converter para CSV, escapando campos que possam conter vírgulas ou quebras de linha
  return [
    headers.join(','),
    ...rows.map(row => row.map(field => {
      // Se o campo contiver vírgulas, quebras de linha ou aspas, envolva em aspas
      if (typeof field === 'string' && (field.includes(',') || field.includes('\n') || field.includes('"'))) {
        return `"${field.replace(/"/g, '""')}"`;
      }
      return field;
    }).join(','))
  ].join('\n');
}

// Função para fazer backup dos dados sem limpar
export function backupData(includeGas = true) {
  try {
    // Verificar se há dados para exportar
    if (deliveries.length === 0 && (!includeGas || gasEntries.length === 0)) {
      throw new Error('Não há dados para exportar');
    }
    
    const date = new Date();
    const { fileName } = generateDeliveryIdentifiers(date);
    
    // Gerar CSV
    const csvContent = generateCSV(includeGas);
    const csvBlob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const csvUrl = URL.createObjectURL(csvBlob);
    
    // Download do CSV
    const link = document.createElement('a');
    link.href = csvUrl;
    link.download = `backup-${fileName}${includeGas ? '' : '-no-gas'}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(csvUrl);
    
    // Otimizar imagens armazenadas
    optimizeStoredImages();
    
    const totalEntries = deliveries.length + (includeGas ? gasEntries.length : 0);
    showToast(`Backup realizado com sucesso! ${totalEntries} registros exportados.`, 'success');
  } catch (error) {
    console.error('Erro ao fazer backup:', error);
    showToast(error.message, 'error');
  }
}

// Função para limpar todos os dados
export function clearAllData() {
  if (!confirm('Tem certeza que deseja limpar todos os dados? Esta ação não pode ser desfeita.')) {
    return;
  }
  
  try {
    // Limpar dados diretamente, sem criar backup
    localStorage.clear();
    deliveries.length = 0;
    gasEntries.length = 0;
    
    loadDeliveries();
    loadGasEntries();
    updateTotals();
    
    showToast('Todos os dados foram limpos com sucesso!', 'success');
  } catch (error) {
    console.error('Erro ao limpar dados:', error);
    showToast(error.message, 'error');
  }
}

// Função para finalizar a semana
export function finishWeek() {
  if (!confirm('Tem certeza que deseja finalizar a semana? Isso irá exportar e limpar todos os dados.')) {
    return;
  }

  try {
    // Verificar se há dados para exportar
    if (deliveries.length === 0 && gasEntries.length === 0) {
      throw new Error('Não há dados para exportar');
    }
    
    const date = new Date();
    const { fileName } = generateDeliveryIdentifiers(date);
    const downloadFilename = `relatorio-${fileName}.csv`;
    
    // Gerar CSV
    const csvContent = generateCSV(true);
    const csvBlob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    
    // Verificar se estamos em um dispositivo móvel
    const isMobileDevice = window.innerWidth <= 768 || 
      /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    
    // Função para limpar dados após o download
    const clearDataAfterExport = () => {
      // Limpar os dados
      localStorage.clear();
      deliveries.length = 0;
      gasEntries.length = 0;
      
      // Recarregar dados
      loadDeliveries();
      loadGasEntries();
      updateTotals();
      
      showToast('Semana finalizada com sucesso!', 'success');
    };
    
    if (isMobileDevice) {
      try {
        // Para iOS Safari e alguns outros navegadores móveis
        if (navigator.share && /iPhone|iPad|iPod/i.test(navigator.userAgent)) {
          // Criar um objeto de arquivo para compartilhar
          const file = new File([csvBlob], downloadFilename, { type: 'text/csv' });
          
          navigator.share({
            files: [file],
            title: 'Exportação de dados semanal',
            text: 'Relatório semanal do Sistema de Entregas'
          }).then(() => {
            clearDataAfterExport();
          }).catch(err => {
            console.error('Erro ao compartilhar arquivo:', err);
            // Fallback para método tradicional
            triggerDirectDownload(true);
          });
        } else {
          // Fallback para download direto
          triggerDirectDownload(true);
        }
      } catch (error) {
        console.error('Erro específico para mobile:', error);
        // Fallback para método tradicional
        triggerDirectDownload(true);
      }
    } else {
      // Método tradicional para desktop
      triggerDirectDownload(true);
    }
    
    // Função de fallback para download direto
    function triggerDirectDownload(shouldClearData) {
      const csvUrl = URL.createObjectURL(csvBlob);
      const link = document.createElement('a');
      link.href = csvUrl;
      link.download = downloadFilename;
      link.style.display = 'none';
      document.body.appendChild(link);
      link.click();
      
      setTimeout(() => {
        document.body.removeChild(link);
        URL.revokeObjectURL(csvUrl);
        
        if (shouldClearData) {
          clearDataAfterExport();
        }
      }, 300);
    }
    
    // Otimizar imagens armazenadas
    optimizeStoredImages();
  } catch (error) {
    console.error('Erro ao finalizar semana:', error);
    showToast(error.message, 'error');
  }
}

// Função para gerar CSV sem imagens
export function generateCSVNoImages(includeGas = true) {
  // Validar dados antes de exportar
  const deliveryErrors = validateExportData(deliveries, 'Entrega');
  const gasErrors = includeGas ? validateExportData(gasEntries, 'Gasolina') : [];
  
  const allErrors = [...deliveryErrors, ...gasErrors];
  if (allErrors.length > 0) {
    throw new Error(`Erros nos dados:\n${allErrors.join('\n')}`);
  }
  
  // Remover a coluna de Imagem
  const headers = ['Data', 'Tipo', 'ID', 'Número do Pedido', 'Valor Pedido', 'Valor Gasolina', 'Status'];
  const rows = [];
  
  // Adicionar entregas
  deliveries.forEach(delivery => {
    rows.push([
      formatDate(delivery.date),
      'Entrega',
      delivery.id,
      delivery.orderNumber,
      delivery.fee,
      '',
      delivery.fee ? 'concluido' : 'pendente'
    ]);
  });
  
  // Adicionar registros de gasolina se includeGas for true
  if (includeGas) {
    gasEntries.forEach(entry => {
      rows.push([
        formatDate(entry.date),
        'Gasolina',
        entry.id,
        '',
        '',
        entry.amount,
        'Pago'
      ]);
    });
  }
  
  // Converter para CSV
  return [
    headers.join(','),
    ...rows.map(row => row.map(field => {
      if (typeof field === 'string' && (field.includes(',') || field.includes('\n') || field.includes('"'))) {
        return `"${field.replace(/"/g, '""')}"`;
      }
      return field;
    }).join(','))
  ].join('\n');
}

// Função para backup sem imagens em CSV
export function backupNoImagesCSV(includeGas = true) {
  try {
    if (deliveries.length === 0 && (!includeGas || gasEntries.length === 0)) {
      throw new Error('Não há dados para exportar');
    }
    const date = new Date();
    const { fileName } = generateDeliveryIdentifiers(date);

    // Gerar CSV sem imagens
    const csvContent = generateCSVNoImages(includeGas);
    const csvBlob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const csvUrl = URL.createObjectURL(csvBlob);

    // Download do CSV
    const link = document.createElement('a');
    link.href = csvUrl;
    link.download = `backup-sem-imagens-${fileName}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(csvUrl);

    const totalEntries = deliveries.length + (includeGas ? gasEntries.length : 0);
    showToast(`Backup sem imagens realizado com sucesso! ${totalEntries} registros exportados.`, 'success');
  } catch (error) {
    console.error('Erro ao fazer backup sem imagens:', error);
    showToast(error.message, 'error');
  }
}

/**
 * Exibe o modal para seleção de opções de exportação CSV
 */
export function showExportModal() {
  // Obter referência ao modal já existente no HTML
  const modal = document.getElementById('exportModal');
  if (!modal) {
    console.error('Modal de exportação não encontrado');
    return;
  }
  
  // Exibir o modal
  modal.style.display = 'flex';
  
  // Obter referências aos elementos do modal
  const deliveriesCheckbox = document.getElementById('exportDeliveries');
  const gasCheckbox = document.getElementById('exportGas');
  const imagesCheckbox = document.getElementById('exportImages');
  
  const deliveriesGroup = document.getElementById('exportDeliveriesGroup');
  const gasGroup = document.getElementById('exportGasGroup');
  const imagesGroup = document.getElementById('exportImagesGroup');
  
  // Limpar listeners antigos para evitar duplicação
  const newDeliveriesGroup = deliveriesGroup.cloneNode(true);
  const newGasGroup = gasGroup.cloneNode(true);
  const newImagesGroup = imagesGroup.cloneNode(true);
  
  deliveriesGroup.parentNode.replaceChild(newDeliveriesGroup, deliveriesGroup);
  gasGroup.parentNode.replaceChild(newGasGroup, gasGroup);
  imagesGroup.parentNode.replaceChild(newImagesGroup, imagesGroup);
  
  // Obter os novos checkboxes após a clonagem
  const newDeliveriesCheckbox = document.getElementById('exportDeliveries');
  const newGasCheckbox = document.getElementById('exportGas');
  const newImagesCheckbox = document.getElementById('exportImages');
  
  // Adicionar evento de clique nos grupos completos para melhor experiência móvel
  newDeliveriesGroup.addEventListener('click', (e) => {
    if (e.target !== newDeliveriesCheckbox) {
      newDeliveriesCheckbox.checked = !newDeliveriesCheckbox.checked;
    }
  });
  
  newGasGroup.addEventListener('click', (e) => {
    if (e.target !== newGasCheckbox) {
      newGasCheckbox.checked = !newGasCheckbox.checked;
    }
  });
  
  newImagesGroup.addEventListener('click', (e) => {
    if (e.target !== newImagesCheckbox) {
      newImagesCheckbox.checked = !newImagesCheckbox.checked;
    }
  });
  
  // Adicionar estilo para aumentar a área clicável
  const styleGroups = [newDeliveriesGroup, newGasGroup, newImagesGroup];
  styleGroups.forEach(group => {
    group.style.cursor = 'pointer';
    group.style.padding = '12px 8px';
    group.style.margin = '8px 0';
    group.style.borderRadius = '4px';
    group.style.border = '1px solid #e0e0e0';
    group.style.transition = 'background-color 0.2s';
    
    // Adicionar efeito hover com JavaScript para melhor desempenho
    group.addEventListener('mouseover', () => {
      group.style.backgroundColor = '#f5f5f5';
    });
    
    group.addEventListener('mouseout', () => {
      group.style.backgroundColor = '';
    });
  });
  
  // Limpar e adicionar event listeners para os botões
  const cancelBtn = document.getElementById('cancelExport');
  const confirmBtn = document.getElementById('confirmExport');
  const exportImagesBtn = document.getElementById('exportOnlyImages');
  
  const newCancelBtn = cancelBtn.cloneNode(true);
  const newConfirmBtn = confirmBtn.cloneNode(true);
  const newExportImagesBtn = exportImagesBtn.cloneNode(true);
  
  cancelBtn.parentNode.replaceChild(newCancelBtn, cancelBtn);
  confirmBtn.parentNode.replaceChild(newConfirmBtn, confirmBtn);
  exportImagesBtn.parentNode.replaceChild(newExportImagesBtn, exportImagesBtn);
  
  newCancelBtn.addEventListener('click', () => {
    modal.style.display = 'none';
  });
  
  newConfirmBtn.addEventListener('click', () => {
    // Obter opções selecionadas
    const includeDeliveries = document.getElementById('exportDeliveries').checked;
    const includeGas = document.getElementById('exportGas').checked;
    const includeImages = document.getElementById('exportImages').checked;
    
    // Validar que pelo menos um tipo de dado foi selecionado
    if (!includeDeliveries && !includeGas) {
      showToast('Selecione pelo menos um tipo de dado para exportar', 'error');
      return;
    }
    
    // Exportar com as opções selecionadas
    exportCustomCSV(includeDeliveries, includeGas, includeImages);
    
    // Fechar o modal
    modal.style.display = 'none';
  });

  // Adicionar evento para o botão de exportar somente imagens
  newExportImagesBtn.addEventListener('click', async () => {
    try {
      // Fechamos o modal antes de mostrar o novo modal de imagens
      modal.style.display = 'none';
      
      // Mostrar o modal de opções de exportação de imagens
      showImagesExportModal();
    } catch (error) {
      console.error('Erro ao abrir modal de exportação de imagens:', error);
      showToast(error.message, 'error');
    }
  });
  
  // Impedir que cliques na caixa modal propaguem para fechar o modal
  const modalContent = modal.querySelector('.edit-modal');
  modalContent.addEventListener('click', event => {
    event.stopPropagation();
  });
  
  // Fechar o modal ao clicar fora dele
  modal.addEventListener('click', () => {
    modal.style.display = 'none';
  });
}

/**
 * Exporta dados para CSV com opções personalizadas
 * @param {boolean} includeDeliveries - Se deve incluir entregas
 * @param {boolean} includeGas - Se deve incluir abastecimentos
 * @param {boolean} includeImages - Se deve incluir referências às imagens
 */
export function exportCustomCSV(includeDeliveries = true, includeGas = true, includeImages = true) {
  try {
    // Usar todos os dados disponíveis
    let filteredDeliveries = [...deliveries];
    let filteredGasEntries = [...gasEntries];
    
    // Verificar se há dados para exportar
    if (
      (!includeDeliveries || filteredDeliveries.length === 0) && 
      (!includeGas || filteredGasEntries.length === 0)
    ) {
      throw new Error('Não há dados para exportar');
    }
    
    // Definir cabeçalhos com base nas opções
    let headers = ['Data', 'Tipo', 'ID', 'Número do Pedido', 'Valor Pedido'];
    if (includeGas) headers.push('Valor Gasolina');
    headers.push('Status');
    if (includeImages) headers.push('Imagem');
    
    const rows = [];
    
    // Adicionar entregas filtradas se solicitado
    if (includeDeliveries) {
      filteredDeliveries.forEach(delivery => {
        const row = [
          formatDate(delivery.date),
          'Entrega',
          delivery.id,
          delivery.orderNumber,
          delivery.fee,
        ];
        
        if (includeGas) row.push(''); // Coluna vazia para valor gasolina
        
        row.push(delivery.fee ? 'concluido' : 'pendente');
        
        if (includeImages) row.push(delivery.image || '');
        
        rows.push(row);
      });
    }
    
    // Adicionar registros de gasolina filtrados se solicitado
    if (includeGas) {
      filteredGasEntries.forEach(entry => {
        const row = [
          formatDate(entry.date),
          'Gasolina',
          entry.id,
          '',
          '',
        ];
        
        if (includeGas) row.push(entry.amount);
        
        row.push('Pago');
        
        if (includeImages) row.push(entry.image || '');
        
        rows.push(row);
      });
    }
    
    // Converter para CSV
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(field => {
        if (typeof field === 'string' && (field.includes(',') || field.includes('\n') || field.includes('"'))) {
          return `"${field.replace(/"/g, '""')}"`;
        }
        return field;
      }).join(','))
    ].join('\n');
    
    // Gerar nome do arquivo
    const date = new Date();
    const { fileName } = generateDeliveryIdentifiers(date);
    
    // Criar sufixo para o nome do arquivo com base nas opções
    let suffix = '';
    if (!includeDeliveries) suffix += '-no-delivery';
    if (!includeGas) suffix += '-no-gas';
    if (!includeImages) suffix += '-no-images';
    
    // Nome do arquivo
    const downloadFilename = `exportacao${suffix}-${fileName}.csv`;
    
    // Verificar se estamos em um dispositivo móvel
    const isMobileDevice = window.innerWidth <= 768 || 
      /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    
    // Download do CSV - usar método diferente para mobile
    const csvBlob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    
    if (isMobileDevice) {
      try {
        // Para iOS Safari e alguns outros navegadores móveis
        if (navigator.share && /iPhone|iPad|iPod/i.test(navigator.userAgent)) {
          // Criar um objeto de arquivo para compartilhar
          const file = new File([csvBlob], downloadFilename, { type: 'text/csv' });
          
          navigator.share({
            files: [file],
            title: 'Exportação de dados',
            text: 'Dados exportados do Sistema de Entregas'
          }).then(() => {
            showToast('Exportação concluída com sucesso!', 'success');
          }).catch(err => {
            console.error('Erro ao compartilhar arquivo:', err);
            // Fallback para método tradicional
            triggerDirectDownload();
          });
        } else {
          // Fallback para download direto
          triggerDirectDownload();
        }
      } catch (error) {
        console.error('Erro específico para mobile:', error);
        // Fallback para método tradicional
        triggerDirectDownload();
      }
    } else {
      // Método tradicional para desktop
      triggerDirectDownload();
    }
    
    // Função de fallback para download direto
    function triggerDirectDownload() {
      const csvUrl = URL.createObjectURL(csvBlob);
      const link = document.createElement('a');
      link.href = csvUrl;
      link.download = downloadFilename;
      link.style.display = 'none';
      document.body.appendChild(link);
      link.click();
      setTimeout(() => {
        document.body.removeChild(link);
        URL.revokeObjectURL(csvUrl);
      }, 100);
    }
    
    // Otimizar imagens armazenadas se incluir imagens
    if (includeImages) {
      optimizeStoredImages();
    }
    
    const totalEntries = 
      (includeDeliveries ? filteredDeliveries.length : 0) + 
      (includeGas ? filteredGasEntries.length : 0);
      
    showToast(`Exportação concluída com sucesso! ${totalEntries} registros exportados.`, 'success');
  } catch (error) {
    console.error('Erro ao exportar dados:', error);
    showToast(error.message, 'error');
  }
}

/**
 * Exporta apenas as imagens dos pedidos como um arquivo ZIP
 * @param {boolean} includeDeliveryImages - Se deve incluir imagens das entregas
 * @param {boolean} includeGasImages - Se deve incluir imagens dos abastecimentos
 */
export async function exportOnlyImages(includeDeliveryImages = true, includeGasImages = true) {
  try {
    // Verificar se o JSZip está disponível (adicionamos como dependência dinâmica)
    if (typeof JSZip !== 'function') {
      // Carregar JSZip dinamicamente se não estiver disponível
      await loadJSZip();
    }
    
    // Criar nova instância do JSZip
    const zip = new JSZip();
    let imageCount = 0;

    // Adicionar imagens das entregas ao ZIP
    if (includeDeliveryImages) {
      deliveries.forEach(delivery => {
        if (delivery.image) {
          // Verificar o formato da imagem (otimizado ou completo)
          const imageData = delivery.image.startsWith('data:') 
            ? delivery.image.split(',')[1]  // Extrair apenas os dados base64
            : delivery.image;               // Já está em formato otimizado
          
          // Nome do arquivo: orderNumber_date.jpg
          const fileName = `pedido_${delivery.orderNumber}_${delivery.date}.jpg`;
          zip.file(fileName, imageData, { base64: true });
          imageCount++;
        }
      });
    }

    // Adicionar imagens dos abastecimentos ao ZIP
    if (includeGasImages) {
      gasEntries.forEach((entry, index) => {
        if (entry.image) {
          // Verificar o formato da imagem
          const imageData = entry.image.startsWith('data:') 
            ? entry.image.split(',')[1] 
            : entry.image;
          
          // Nome do arquivo: gas_date_index.jpg
          const fileName = `gasolina_${entry.date}_${index + 1}.jpg`;
          zip.file(fileName, imageData, { base64: true });
          imageCount++;
        }
      });
    }

    // Verificar se há imagens para exportar
    if (imageCount === 0) {
      throw new Error('Não há imagens para exportar');
    }

    // Gerar nome do arquivo ZIP
    const date = new Date();
    const { fileName } = generateDeliveryIdentifiers(date);
    let suffix = '';
    if (!includeDeliveryImages) suffix += '-no-delivery';
    if (!includeGasImages) suffix += '-no-gas';
    const zipFileName = `imagens${suffix}-${fileName}.zip`;

    // Gerar o arquivo ZIP
    const zipBlob = await zip.generateAsync({ type: 'blob' });
    
    // Verificar se estamos em um dispositivo móvel
    const isMobileDevice = window.innerWidth <= 768 || 
      /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    
    if (isMobileDevice) {
      try {
        // Para iOS Safari e outros navegadores móveis com suporte ao Web Share API
        if (navigator.share && /iPhone|iPad|iPod/i.test(navigator.userAgent)) {
          const file = new File([zipBlob], zipFileName, { type: 'application/zip' });
          
          navigator.share({
            files: [file],
            title: 'Imagens Exportadas',
            text: 'Imagens exportadas do Sistema de Entregas'
          }).then(() => {
            showToast(`Exportação de imagens concluída! ${imageCount} imagens exportadas.`, 'success');
          }).catch(err => {
            console.error('Erro ao compartilhar arquivo:', err);
            // Fallback para download direto
            downloadZipFile(zipBlob, zipFileName);
          });
        } else {
          // Fallback para download direto
          downloadZipFile(zipBlob, zipFileName);
        }
      } catch (error) {
        console.error('Erro específico para mobile:', error);
        downloadZipFile(zipBlob, zipFileName);
      }
    } else {
      // Método tradicional para desktop
      downloadZipFile(zipBlob, zipFileName);
    }
    
    showToast(`Exportação de imagens concluída! ${imageCount} imagens exportadas.`, 'success');
  } catch (error) {
    console.error('Erro ao exportar imagens:', error);
    showToast(error.message, 'error');
  }
}

/**
 * Função auxiliar para fazer download do arquivo ZIP
 * @param {Blob} blob - Blob do arquivo ZIP
 * @param {string} fileName - Nome do arquivo para download
 */
function downloadZipFile(blob, fileName) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  setTimeout(() => {
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, 100);
}

/**
 * Carrega a biblioteca JSZip dinamicamente
 * @returns {Promise} Promessa resolvida quando a biblioteca é carregada
 */
function loadJSZip() {
  return new Promise((resolve, reject) => {
    // Verificar se o JSZip já está disponível
    if (typeof JSZip === 'function') {
      resolve();
      return;
    }
    
    // Criar elemento de script para carregar JSZip
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js';
    script.integrity = 'sha512-XMVd28F1oH/O71fzwBnV7HucLxVwtxf26XV8P4wPk26EDxuGZ91N8bsOttmnomcCD3CS5ZMRL50H0GgOHvegtg==';
    script.crossOrigin = 'anonymous';
    
    script.onload = () => {
      resolve();
    };
    
    script.onerror = () => {
      reject(new Error('Falha ao carregar biblioteca JSZip'));
    };
    
    document.head.appendChild(script);
  });
}

/**
 * Exibe o modal para seleção de opções de exportação de imagens
 */
export function showImagesExportModal() {
  // Obter referência ao modal
  const modal = document.getElementById('imagesExportModal');
  if (!modal) {
    console.error('Modal de exportação de imagens não encontrado');
    return;
  }
  
  // Exibir o modal
  modal.style.display = 'flex';
  
  // Obter referências aos elementos do modal
  const deliveryImagesCheckbox = document.getElementById('exportDeliveryImages');
  const gasImagesCheckbox = document.getElementById('exportGasImages');
  
  const deliveryImagesGroup = document.getElementById('exportDeliveryImagesGroup');
  const gasImagesGroup = document.getElementById('exportGasImagesGroup');
  
  // Limpar listeners antigos para evitar duplicação
  const newDeliveryImagesGroup = deliveryImagesGroup.cloneNode(true);
  const newGasImagesGroup = gasImagesGroup.cloneNode(true);
  
  deliveryImagesGroup.parentNode.replaceChild(newDeliveryImagesGroup, deliveryImagesGroup);
  gasImagesGroup.parentNode.replaceChild(newGasImagesGroup, gasImagesGroup);
  
  // Obter os novos checkboxes após a clonagem
  const newDeliveryImagesCheckbox = document.getElementById('exportDeliveryImages');
  const newGasImagesCheckbox = document.getElementById('exportGasImages');
  
  // Adicionar evento de clique nos grupos completos para melhor experiência móvel
  newDeliveryImagesGroup.addEventListener('click', (e) => {
    if (e.target !== newDeliveryImagesCheckbox) {
      newDeliveryImagesCheckbox.checked = !newDeliveryImagesCheckbox.checked;
    }
  });
  
  newGasImagesGroup.addEventListener('click', (e) => {
    if (e.target !== newGasImagesCheckbox) {
      newGasImagesCheckbox.checked = !newGasImagesCheckbox.checked;
    }
  });
  
  // Adicionar estilo para aumentar a área clicável
  const styleGroups = [newDeliveryImagesGroup, newGasImagesGroup];
  styleGroups.forEach(group => {
    group.style.cursor = 'pointer';
    group.style.padding = '12px 8px';
    group.style.margin = '8px 0';
    group.style.borderRadius = '4px';
    group.style.border = '1px solid #e0e0e0';
    group.style.transition = 'background-color 0.2s';
    
    // Adicionar efeito hover
    group.addEventListener('mouseover', () => {
      group.style.backgroundColor = '#f5f5f5';
    });
    
    group.addEventListener('mouseout', () => {
      group.style.backgroundColor = '';
    });
  });
  
  // Limpar e adicionar event listeners para os botões
  const cancelBtn = document.getElementById('cancelImagesExport');
  const confirmBtn = document.getElementById('confirmImagesExport');
  
  const newCancelBtn = cancelBtn.cloneNode(true);
  const newConfirmBtn = confirmBtn.cloneNode(true);
  
  cancelBtn.parentNode.replaceChild(newCancelBtn, cancelBtn);
  confirmBtn.parentNode.replaceChild(newConfirmBtn, confirmBtn);
  
  newCancelBtn.addEventListener('click', () => {
    modal.style.display = 'none';
  });
  
  newConfirmBtn.addEventListener('click', async () => {
    try {
      // Obter opções selecionadas
      const includeDeliveryImages = document.getElementById('exportDeliveryImages').checked;
      const includeGasImages = document.getElementById('exportGasImages').checked;
      
      // Validar que pelo menos um tipo de imagem foi selecionado
      if (!includeDeliveryImages && !includeGasImages) {
        showToast('Selecione pelo menos um tipo de imagem para exportar', 'error');
        return;
      }
      
      // Fechar o modal antes de começar o processo
      modal.style.display = 'none';
      
      // Mostrar toast informativo enquanto processa
      showToast('Preparando imagens para exportação...', 'info');
      
      // Exportar imagens com as opções selecionadas
      await exportOnlyImages(includeDeliveryImages, includeGasImages);
    } catch (error) {
      console.error('Erro ao exportar imagens:', error);
      showToast(error.message, 'error');
    }
  });
  
  // Impedir que cliques na caixa modal propaguem para fechar o modal
  const modalContent = modal.querySelector('.edit-modal');
  modalContent.addEventListener('click', event => {
    event.stopPropagation();
  });
  
  // Fechar o modal ao clicar fora dele
  modal.addEventListener('click', () => {
    modal.style.display = 'none';
  });
} 