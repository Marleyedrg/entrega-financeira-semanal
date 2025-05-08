// Adicionar este código ao final do script.js

// Configurar o botão de importação de CSV para análise
const importAnalyticsButton = document.getElementById("importAnalyticsButton")
const analyticsCSVInput = document.getElementById("analyticsCSVInput")

// Declare the variables
let handleAnalyticsCSVImport
let currentAnalyticsData
let showToast

importAnalyticsButton.addEventListener("click", () => {
  analyticsCSVInput.click()
})

analyticsCSVInput.addEventListener("change", handleAnalyticsCSVImport)

// Limpar a referência ao localStorage para arquivos de análise
window.addEventListener("DOMContentLoaded", () => {
  // Código existente...

  // Remover a inicialização de analyticsFiles do localStorage
  // Agora vamos trabalhar apenas com arquivos CSV importados diretamente

  // Atualizar o texto do botão de finalizar semana
  const finishWeekButton = document.getElementById("finishWeekButton")
  finishWeekButton.title = "Exportar dados e limpar todas as entregas"

  // Adicionar confirmação ao botão de backup
  const backupButton = document.getElementById("backupButton")
  backupButton.title = "Fazer backup sem limpar os dados"
})

// Adicionar mensagem explicativa na aba de análise
document.addEventListener("DOMContentLoaded", () => {
  const analyticsTab = document.querySelector('[data-tab="analytics"]')

  analyticsTab.addEventListener("click", () => {
    if (!currentAnalyticsData) {
      setTimeout(() => {
        showToast("Importe um arquivo CSV para visualizar a análise de dados", "info")
      }, 500)
    }
  })
})
