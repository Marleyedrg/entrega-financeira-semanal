export function handleGasEditSubmit(event) {
  event.preventDefault();
  
  // ... existing validation and update code ...
  
  saveGasEntries();
  updateGasTable();
  updateTotals();
  renderAnalytics();
  
  closeGasEditModal();
  showToast('Registro de gasolina atualizado com sucesso!', 'success');
} 