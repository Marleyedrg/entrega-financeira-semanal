// Bills Manager - Manages fixed bills and calculates daily budget
import { showToast } from './utils.js';

// Bills data storage
export let bills = [];
let monthlyIncome = 0;

// Category icons and labels
const categoryConfig = {
  moradia: { icon: '🏠', label: 'Moradia' },
  transporte: { icon: '🚗', label: 'Transporte' },
  alimentacao: { icon: '🍽️', label: 'Alimentação' },
  saude: { icon: '💊', label: 'Saúde' },
  educacao: { icon: '📚', label: 'Educação' },
  lazer: { icon: '🎮', label: 'Lazer' },
  outros: { icon: '📦', label: 'Outros' }
};

/**
 * Initializes the bills module
 */
export function initializeBills() {
  loadBillsData();
  setupBillsForm();
  setupIncomeInput();
  updateBillsTable();
  updateBudgetCalculator();
  
  console.log('Bills module initialized');
}

/**
 * Loads bills data from localStorage
 */
function loadBillsData() {
  try {
    const savedBills = localStorage.getItem('bills');
    if (savedBills) {
      bills = JSON.parse(savedBills);
    }
    
    const savedIncome = localStorage.getItem('monthlyIncome');
    if (savedIncome) {
      monthlyIncome = parseFloat(savedIncome) || 0;
      const incomeInput = document.getElementById('monthlyIncome');
      if (incomeInput) {
        incomeInput.value = monthlyIncome;
      }
    }
  } catch (error) {
    console.error('Error loading bills data:', error);
    bills = [];
    monthlyIncome = 0;
  }
}

/**
 * Saves bills data to localStorage
 */
function saveBillsData() {
  try {
    localStorage.setItem('bills', JSON.stringify(bills));
    localStorage.setItem('monthlyIncome', monthlyIncome.toString());
  } catch (error) {
    console.error('Error saving bills data:', error);
    showToast('Erro ao salvar dados das contas', 'error');
  }
}

/**
 * Sets up the bills form event listeners
 */
function setupBillsForm() {
  const form = document.getElementById('billsForm');
  if (form) {
    form.addEventListener('submit', handleBillSubmit);
  }
}

/**
 * Sets up the monthly income input
 */
function setupIncomeInput() {
  const incomeInput = document.getElementById('monthlyIncome');
  if (incomeInput) {
    incomeInput.addEventListener('input', handleIncomeChange);
    incomeInput.addEventListener('blur', handleIncomeBlur);
  }
}

/**
 * Handles bill form submission
 */
function handleBillSubmit(event) {
  event.preventDefault();
  
  const billName = document.getElementById('billName').value.trim();
  const billAmount = parseFloat(document.getElementById('billAmount').value) || 0;
  const billDueDate = parseInt(document.getElementById('billDueDate').value) || null;
  const billCategory = document.getElementById('billCategory').value;
  
  if (!billName) {
    showToast('Nome da conta é obrigatório', 'error');
    return;
  }
  
  if (billAmount <= 0) {
    showToast('Valor da conta deve ser maior que zero', 'error');
    return;
  }
  
  // Create new bill
  const newBill = {
    id: Date.now().toString(),
    name: billName,
    amount: billAmount,
    dueDate: billDueDate,
    category: billCategory,
    createdAt: new Date().toISOString()
  };
  
  // Add to bills array
  bills.push(newBill);
  
  // Save and update UI
  saveBillsData();
  updateBillsTable();
  updateBudgetCalculator();
  
  // Clear form
  event.target.reset();
  
  showToast('Conta adicionada com sucesso!', 'success');
  console.log('Bill added:', newBill);
}

/**
 * Handles monthly income input changes
 */
function handleIncomeChange(event) {
  const value = parseFloat(event.target.value) || 0;
  monthlyIncome = value;
  updateBudgetCalculator();
}

/**
 * Handles monthly income input blur (save data)
 */
function handleIncomeBlur() {
  saveBillsData();
}

/**
 * Updates the bills table
 */
function updateBillsTable() {
  const tbody = document.getElementById('billsTableBody');
  if (!tbody) return;
  
  tbody.innerHTML = '';
  
  if (bills.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="5" class="no-data">
          <div class="no-data-message">
            <i class="fas fa-receipt"></i>
            <p>Nenhuma conta registrada</p>
            <small>Adicione suas contas fixas usando o formulário acima</small>
          </div>
        </td>
      </tr>
    `;
    return;
  }
  
  // Sort bills by due date, then by name
  const sortedBills = [...bills].sort((a, b) => {
    if (a.dueDate && b.dueDate) {
      return a.dueDate - b.dueDate;
    }
    if (a.dueDate && !b.dueDate) return -1;
    if (!a.dueDate && b.dueDate) return 1;
    return a.name.localeCompare(b.name);
  });
  
  sortedBills.forEach(bill => {
    const row = document.createElement('tr');
    
    const categoryInfo = categoryConfig[bill.category] || categoryConfig.outros;
    const dueDateDisplay = bill.dueDate ? `Dia ${bill.dueDate}` : '-';
    const dueDateClass = getDueDateClass(bill.dueDate);
    
    row.innerHTML = `
      <td>
        <strong>${bill.name}</strong>
      </td>
      <td>
        <span class="amount">R$ ${bill.amount.toFixed(2)}</span>
      </td>
      <td>
        <span class="due-date ${dueDateClass}">${dueDateDisplay}</span>
      </td>
      <td>
        <span class="category-badge category-${bill.category}">
          ${categoryInfo.icon} ${categoryInfo.label}
        </span>
      </td>
      <td>
        <div class="action-buttons">
          <button class="action-btn edit" onclick="editBill('${bill.id}')" title="Editar">
            <i class="fas fa-edit"></i>
          </button>
          <button class="action-btn delete" onclick="deleteBill('${bill.id}')" title="Excluir">
            <i class="fas fa-trash"></i>
          </button>
        </div>
      </td>
    `;
    
    tbody.appendChild(row);
  });
}

/**
 * Gets CSS class for due date based on current date
 */
function getDueDateClass(dueDate) {
  if (!dueDate) return '';
  
  const today = new Date();
  const currentDay = today.getDate();
  
  if (dueDate < currentDay) {
    return 'overdue';
  } else if (dueDate <= currentDay + 5) {
    return 'due-soon';
  }
  
  return '';
}

/**
 * Updates the budget calculator display
 */
function updateBudgetCalculator() {
  console.log('🔄 updateBudgetCalculator called');
  
  const totalBillsElement = document.getElementById('totalBills');
  const dailyBudgetElement = document.getElementById('dailyBudget');
  const daysInMonthElement = document.getElementById('daysInMonth');
  
  // Check if bills tab elements are available
  if (!totalBillsElement && !dailyBudgetElement) {
    console.log('⚠️ Bills tab elements not found, budget calculation skipped');
    return;
  }
  
  // Calculate total bills
  const totalBills = bills.reduce((sum, bill) => sum + bill.amount, 0);
  
  // Get current month and year
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  
  // Get current gas entries from localStorage to ensure we have the latest data
  let gasEntries = [];
  try {
    const storedGasEntries = localStorage.getItem('gasEntries');
    gasEntries = storedGasEntries ? JSON.parse(storedGasEntries) : [];
  } catch (error) {
    console.warn('Error loading gas entries for budget calculation:', error);
    gasEntries = [];
  }
  
  // Calculate total daily expenses from current month's gas entries
  const currentMonthGasEntries = gasEntries.filter(entry => {
    const entryDate = new Date(entry.date + 'T00:00:00');
    return entryDate.getMonth() === currentMonth && entryDate.getFullYear() === currentYear;
  });
  
  const totalMonthlyExpenses = currentMonthGasEntries.reduce((sum, entry) => sum + parseFloat(entry.amount || 0), 0);
  const averageDailyExpenses = currentMonthGasEntries.length > 0 ? totalMonthlyExpenses / currentMonthGasEntries.length : 0;
  
  // Calculate available amount after bills and current expenses pattern
  const availableAmount = monthlyIncome - totalBills;
  const projectedMonthlyExpenses = averageDailyExpenses * daysInMonth;
  const remainingBudget = availableAmount - projectedMonthlyExpenses;
  const dailyBudget = availableAmount > 0 ? availableAmount / daysInMonth : 0;
  const adjustedDailyBudget = remainingBudget > 0 ? remainingBudget / daysInMonth : 0;
  
  // Update display
  if (totalBillsElement) {
    totalBillsElement.textContent = totalBills.toFixed(2);
  }
  
  // Update monthly expenses display
  const monthlyExpensesElement = document.getElementById('monthlyExpenses');
  const expensesCountElement = document.getElementById('expensesCount');
  
  if (monthlyExpensesElement) {
    monthlyExpensesElement.textContent = totalMonthlyExpenses.toFixed(2);
  }
  
  if (expensesCountElement) {
    expensesCountElement.textContent = currentMonthGasEntries.length;
  }
  
  if (dailyBudgetElement) {
    // Show the adjusted daily budget that considers current expenses
    const displayBudget = adjustedDailyBudget > 0 ? adjustedDailyBudget : dailyBudget;
    dailyBudgetElement.textContent = displayBudget.toFixed(2);
    
    // Add visual feedback based on budget
    const budgetCard = dailyBudgetElement.closest('.budget-card');
    if (budgetCard) {
      budgetCard.classList.remove('negative-budget', 'low-budget');
      
      if (availableAmount < 0 || remainingBudget < 0) {
        budgetCard.classList.add('negative-budget');
      } else if (displayBudget < 20) {
        budgetCard.classList.add('low-budget');
      }
    }
  }
  
  if (daysInMonthElement) {
    daysInMonthElement.textContent = daysInMonth;
  }
  
  // Update formula text to show integration with expenses
  const formulaElement = document.querySelector('.budget-formula');
  if (formulaElement && currentMonthGasEntries.length > 0) {
    formulaElement.innerHTML = `
      (Renda - Contas - Gastos Médios) ÷ <span id="daysInMonth">${daysInMonth}</span> dias<br>
      <small style="opacity: 0.7;">Baseado em ${currentMonthGasEntries.length} gastos este mês</small>
    `;
  }
  
  console.log(`💰 Budget calculated: Income R$${monthlyIncome}, Bills R$${totalBills}, Monthly Expenses R$${totalMonthlyExpenses.toFixed(2)} (${currentMonthGasEntries.length} entries), Adjusted Daily Budget R$${displayBudget.toFixed(2)}`);
  
  // Force update of elements even if they weren't found initially
  setTimeout(() => {
    const delayedTotalBillsElement = document.getElementById('totalBills');
    const delayedDailyBudgetElement = document.getElementById('dailyBudget');
    const delayedMonthlyExpensesElement = document.getElementById('monthlyExpenses');
    const delayedExpensesCountElement = document.getElementById('expensesCount');
    
    if (delayedTotalBillsElement && !totalBillsElement) {
      delayedTotalBillsElement.textContent = totalBills.toFixed(2);
      console.log('✅ Updated total bills element (delayed)');
    }
    
    if (delayedDailyBudgetElement && !dailyBudgetElement) {
      const displayBudget = adjustedDailyBudget > 0 ? adjustedDailyBudget : dailyBudget;
      delayedDailyBudgetElement.textContent = displayBudget.toFixed(2);
      console.log('✅ Updated daily budget element (delayed)');
    }
    
    if (delayedMonthlyExpensesElement && !monthlyExpensesElement) {
      delayedMonthlyExpensesElement.textContent = totalMonthlyExpenses.toFixed(2);
      console.log('✅ Updated monthly expenses element (delayed)');
    }
    
    if (delayedExpensesCountElement && !expensesCountElement) {
      delayedExpensesCountElement.textContent = currentMonthGasEntries.length;
      console.log('✅ Updated expenses count element (delayed)');
    }
  }, 100);
}

/**
 * Deletes a bill
 */
export function deleteBill(billId) {
  const bill = bills.find(b => b.id === billId);
  if (!bill) return;
  
  const confirmed = confirm(`Tem certeza que deseja excluir a conta "${bill.name}"?`);
  if (!confirmed) return;
  
  // Remove from array
  bills = bills.filter(b => b.id !== billId);
  
  // Save and update UI
  saveBillsData();
  updateBillsTable();
  updateBudgetCalculator();
  
  showToast('Conta excluída com sucesso!', 'success');
}

/**
 * Edits a bill (placeholder for future implementation)
 */
export function editBill(billId) {
  const bill = bills.find(b => b.id === billId);
  if (!bill) return;
  
  // For now, just show an alert with bill details
  const categoryInfo = categoryConfig[bill.category] || categoryConfig.outros;
  const dueDate = bill.dueDate ? `Dia ${bill.dueDate}` : 'Não definido';
  
  alert(
    `Editar Conta:\n\n` +
    `Nome: ${bill.name}\n` +
    `Valor: R$ ${bill.amount.toFixed(2)}\n` +
    `Vencimento: ${dueDate}\n` +
    `Categoria: ${categoryInfo.label}\n\n` +
    `(Funcionalidade de edição será implementada em breve)`
  );
}

/**
 * Gets bills summary for analytics
 */
export function getBillsSummary() {
  const totalBills = bills.reduce((sum, bill) => sum + bill.amount, 0);
  const now = new Date();
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const availableAmount = monthlyIncome - totalBills;
  const dailyBudget = availableAmount > 0 ? availableAmount / daysInMonth : 0;
  
  return {
    monthlyIncome,
    totalBills,
    availableAmount,
    dailyBudget,
    daysInMonth,
    billsCount: bills.length
  };
}

/**
 * Clears all bills data
 */
export function clearAllBills() {
  bills = [];
  monthlyIncome = 0;
  
  // Clear localStorage
  localStorage.removeItem('bills');
  localStorage.removeItem('monthlyIncome');
  
  // Update UI
  const incomeInput = document.getElementById('monthlyIncome');
  if (incomeInput) {
    incomeInput.value = '';
  }
  
  updateBillsTable();
  updateBudgetCalculator();
  
  console.log('All bills data cleared');
}

/**
 * Updates budget calculator when gas entries change
 * This function is called from the gas management system
 */
export function updateBudgetFromGasChanges() {
  console.log('🔄 updateBudgetFromGasChanges called');
  updateBudgetCalculator();
  console.log('✅ Budget updated due to gas entries changes');
}

// Make functions available globally for onclick handlers
window.deleteBill = deleteBill;
window.editBill = editBill; 