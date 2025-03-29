// Mostrar/esconder o menu
document.getElementById('abrirMenuBtn').addEventListener('click', () => {
    const menu = document.getElementById('menuDownload');
    menu.classList.toggle('oculto');
  });
  
  // Baixar de acordo com o que foi selecionado
  function baixarSelecionado() {
    const tabela = document.getElementById('tabelaSelect').value;
    const formato = document.getElementById('formatoSelect').value;
  
    const url = `http://localhost:3000/export/${formato}?tabela=${tabela}`;
    const link = document.createElement('a');
    link.href = url;
    link.download = `${tabela}.${formato === 'shp' ? 'zip' : formato}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }


