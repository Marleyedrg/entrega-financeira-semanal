export async function handleGasEditSubmit(event) {
  event.preventDefault();
  
  // ... existing validation and update code ...
  
  saveGasEntries();
  
  // Update bills budget calculator
  console.log('🔄 Calling budget update after gas entry edited');
  try {
    const { updateBudgetFromGasChanges } = await import('./billsManager.js');
    updateBudgetFromGasChanges();
    console.log('✅ Budget update called successfully after edit');
  } catch (error) {
    console.log('⚠️ Could not update budget after edit:', error);
  }
  
  updateGasTable();
  updateTotals();
  renderAnalytics();
  
  closeGasEditModal();
  showToast('Gasto atualizado com sucesso!', 'success');
} 