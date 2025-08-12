export function handleGasEditSubmit(event) {
  event.preventDefault();
  
  // ... existing validation and update code ...
  
  saveGasEntries();
  updateGasTable();
  updateTotals();
  renderAnalytics();
  
  closeGasEditModal();
  showToast('Gasto atualizado com sucesso!', 'success');
} 