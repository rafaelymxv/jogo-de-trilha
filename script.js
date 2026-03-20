(function() {
    // Configurações do tabuleiro estilo geométrico
    const BOARD_SIZE = 700;
    const PADDING = 60;
    const GRID_SIZE = BOARD_SIZE - (PADDING * 2);
    
    // Pontos do tabuleiro - estilo geométrico com 24 pontos
    // Organizado em 3 anéis: externo, médio e interno
    const pointsCoords = [];
    
    // Função para gerar coordenadas dos pontos
    function generatePoints() {
        const centerX = BOARD_SIZE / 2;
        const centerY = BOARD_SIZE / 2;
        
        // Anel externo (raio maior)
        const outerRadius = 280;
        // Anel médio
        const middleRadius = 190;
        // Anel interno
        const innerRadius = 100;
        
        // Ângulos para os 12 pontos (30 graus cada)
        const angles = [];
        for (let i = 0; i < 12; i++) {
            angles.push((i * 30) * Math.PI / 180);
        }
        
        // Anel externo (pontos 0-11)
        for (let i = 0; i < 12; i++) {
            pointsCoords.push({
                x: centerX + outerRadius * Math.cos(angles[i]),
                y: centerY + outerRadius * Math.sin(angles[i]),
                ring: 'outer',
                angle: angles[i]
            });
        }
        
        // Anel médio (pontos 12-23)
        for (let i = 0; i < 12; i++) {
            pointsCoords.push({
                x: centerX + middleRadius * Math.cos(angles[i]),
                y: centerY + middleRadius * Math.sin(angles[i]),
                ring: 'middle',
                angle: angles[i]
            });
        }
        
        // Anel interno (pontos 24-35)
        for (let i = 0; i < 12; i++) {
            pointsCoords.push({
                x: centerX + innerRadius * Math.cos(angles[i]),
                y: centerY + innerRadius * Math.sin(angles[i]),
                ring: 'inner',
                angle: angles[i]
            });
        }
    }
    
    generatePoints();
    
    // Definição das conexões (arestas) - estilo tabuleiro de trilha clássico
    const edges = [];
    
    // Conexões entre pontos do mesmo anel (adjacentes)
    for (let ring = 0; ring < 3; ring++) {
        const startIdx = ring * 12;
        for (let i = 0; i < 11; i++) {
            edges.push([startIdx + i, startIdx + i + 1]);
        }
        edges.push([startIdx + 11, startIdx]); // Fecha o círculo
    }
    
    // Conexões radiais entre os anéis (mesmo ângulo)
    for (let i = 0; i < 12; i++) {
        edges.push([i, i + 12]);          // externo -> médio
        edges.push([i + 12, i + 24]);     // médio -> interno
    }
    
    // Conexões em cruz (formando trilhas especiais)
    // Adicionando algumas diagonais para criar mais possibilidades de trilhas
    const specialEdges = [
        // Ligações entre pontos em ângulos opostos
        [0, 6], [1, 7], [2, 8], [3, 9], [4, 10], [5, 11], // externo opostos
        [12, 18], [13, 19], [14, 20], [15, 21], [16, 22], [17, 23], // médio opostos
        [24, 30], [25, 31], [26, 32], [27, 33], [28, 34], [29, 35] // interno opostos
    ];
    
    specialEdges.forEach(edge => edges.push(edge));
    
    // Definição de todas as combinações de trilhas (mill)
    const millCombinations = [];
    
    // Trilhas horizontais/verticais no mesmo anel (grupos de 3)
    for (let ring = 0; ring < 3; ring++) {
        const startIdx = ring * 12;
        for (let i = 0; i < 12; i++) {
            // Grupos de 3 pontos consecutivos
            const p1 = startIdx + i;
            const p2 = startIdx + ((i + 1) % 12);
            const p3 = startIdx + ((i + 2) % 12);
            millCombinations.push([p1, p2, p3]);
        }
    }
    
    // Trilhas radiais (mesmo ângulo nos 3 anéis)
    for (let i = 0; i < 12; i++) {
        millCombinations.push([i, i + 12, i + 24]);
    }
    
    // Trilhas em formato de estrela (opostos)
    for (let i = 0; i < 6; i++) {
        millCombinations.push([i, i + 6, i + 12]);
        millCombinations.push([i + 12, i + 18, i + 24]);
    }
    
    // Remover combinações duplicadas
    const uniqueMills = [];
    const millStrings = new Set();
    for (const mill of millCombinations) {
        const sorted = [...mill].sort((a,b) => a-b);
        const key = sorted.join(',');
        if (!millStrings.has(key)) {
            millStrings.add(key);
            uniqueMills.push(mill);
        }
    }
    
    // Cores tema rosa
    const PLAYER1_COLOR = "#E8436E";
    const PLAYER2_COLOR = "#FF9FBF";
    const PLAYER1_GLOW = "#FFB7D0";
    const PLAYER2_GLOW = "#FFCDE5";
    
    let canvas = document.getElementById('gameCanvas');
    let ctx = canvas.getContext('2d');
    
    // Ajustar tamanho do canvas
    function resizeCanvas() {
        const container = canvas.parentElement;
        const size = Math.min(container.clientWidth, 700);
        canvas.style.width = `${size}px`;
        canvas.style.height = `${size}px`;
    }
    window.addEventListener('resize', resizeCanvas);
    resizeCanvas();
    
    // Estado do jogo
    let board = Array(36).fill(null);
    let currentPlayer = 'P1';
    let phase = 'place';
    let piecesPlaced = { P1: 0, P2: 0 };
    const TOTAL_PIECES = 12;
    
    let selectedPoint = null;
    let waitingForRemoval = false;
    let currentMills = [];
    
    // Obter peças removíveis do oponente
    function getRemovablePieces(opponent) {
        const opponentIndices = [];
        for (let i = 0; i < board.length; i++) {
            if (board[i] === opponent) opponentIndices.push(i);
        }
        
        if (opponentIndices.length === 0) return [];
        
        // Encontrar mills do oponente
        const opponentMills = [];
        for (const combo of uniqueMills) {
            if (combo.every(idx => board[idx] === opponent)) {
                opponentMills.push(combo);
            }
        }
        
        const piecesInMills = new Set();
        opponentMills.forEach(mill => {
            mill.forEach(idx => piecesInMills.add(idx));
        });
        
        // Se todas as peças estão em mills, pode remover qualquer uma
        if (piecesInMills.size === opponentIndices.length) {
            return opponentIndices;
        }
        
        // Caso contrário, só remove peças que não estão em mills
        return opponentIndices.filter(idx => !piecesInMills.has(idx));
    }
    
    // Verificar se um ponto forma uma mill
    function checkAndHandleMill(pointIdx, player) {
        const newMills = [];
        for (const combo of uniqueMills) {
            if (combo.includes(pointIdx) && combo.every(idx => board[idx] === player)) {
                newMills.push(combo);
            }
        }
        
        if (newMills.length > 0) {
            currentMills = newMills;
            waitingForRemoval = true;
            phase = 'remove';
            updateUI();
            drawBoard();
            return true;
        }
        return false;
    }
    
    // Remover peça
    function removePiece(pointIdx) {
        if (board[pointIdx] === null) return false;
        const opponent = currentPlayer === 'P1' ? 'P2' : 'P1';
        if (board[pointIdx] !== opponent) return false;
        
        const removable = getRemovablePieces(opponent);
        if (!removable.includes(pointIdx)) return false;
        
        board[pointIdx] = null;
        
        // Verificar vitória
        const remainingOpponent = board.filter(p => p === opponent).length;
        if (remainingOpponent < 3) {
            endGame(currentPlayer);
            return true;
        }
        
        waitingForRemoval = false;
        currentMills = [];
        
        switchPlayer();
        updateUI();
        drawBoard();
        return true;
    }
    
    // Finalizar jogo
    function endGame(winner) {
        const winnerName = winner === 'P1' ? 'Jogador 1 🌸' : 'Jogador 2 💖';
        setTimeout(() => {
            alert(`🎉 ${winnerName} venceu o jogo! 🎉\nClique em "Novo Jogo" para jogar novamente.`);
        }, 50);
        resetGame();
    }
    
    // Colocar peça
    function placePiece(pointIdx) {
        if (board[pointIdx] !== null) return false;
        
        board[pointIdx] = currentPlayer;
        piecesPlaced[currentPlayer]++;
        
        const formedMill = checkAndHandleMill(pointIdx, currentPlayer);
        
        if (!formedMill) {
            if (piecesPlaced[currentPlayer] === TOTAL_PIECES && piecesPlaced[getOpponent()] === TOTAL_PIECES) {
                phase = 'move';
                updateUI();
            }
            switchPlayer();
        }
        
        updateUI();
        drawBoard();
        return true;
    }
    
    // Mover peça
    function movePiece(fromIdx, toIdx) {
        if (board[fromIdx] !== currentPlayer) return false;
        if (board[toIdx] !== null) return false;
        
        // Verificar se é movimento válido
        const isValidMove = edges.some(edge => 
            (edge[0] === fromIdx && edge[1] === toIdx) || 
            (edge[1] === fromIdx && edge[0] === toIdx)
        );
        
        if (!isValidMove) return false;
        
        board[fromIdx] = null;
        board[toIdx] = currentPlayer;
        
        const formedMill = checkAndHandleMill(toIdx, currentPlayer);
        
        if (!formedMill) {
            switchPlayer();
        }
        
        selectedPoint = null;
        updateUI();
        drawBoard();
        return true;
    }
    
    // Trocar jogador
    function switchPlayer() {
        currentPlayer = currentPlayer === 'P1' ? 'P2' : 'P1';
        
        if (phase === 'move') {
            const hasMoves = checkPlayerHasMoves(currentPlayer);
            if (!hasMoves) {
                const winner = currentPlayer === 'P1' ? 'P2' : 'P1';
                endGame(winner);
            }
        }
    }
    
    // Verificar se jogador tem movimentos
    function checkPlayerHasMoves(player) {
        const playerPieces = [];
        for (let i = 0; i < board.length; i++) {
            if (board[i] === player) playerPieces.push(i);
        }
        
        for (const piece of playerPieces) {
            for (const edge of edges) {
                const neighbor = edge[0] === piece ? edge[1] : (edge[1] === piece ? edge[0] : null);
                if (neighbor !== null && board[neighbor] === null) {
                    return true;
                }
            }
        }
        return false;
    }
    
    function getOpponent() {
        return currentPlayer === 'P1' ? 'P2' : 'P1';
    }
    
    // Manipular clique
    function handleCanvasClick(e) {
        if (waitingForRemoval) return;
        
        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        
        const mouseX = (e.clientX - rect.left) * scaleX;
        const mouseY = (e.clientY - rect.top) * scaleY;
        
        let clickedPoint = null;
        let minDist = 25;
        for (let i = 0; i < pointsCoords.length; i++) {
            const p = pointsCoords[i];
            const dx = p.x - mouseX;
            const dy = p.y - mouseY;
            const dist = Math.sqrt(dx*dx + dy*dy);
            if (dist < minDist) {
                minDist = dist;
                clickedPoint = i;
            }
        }
        
        if (clickedPoint === null) return;
        
        if (phase === 'place') {
            if (piecesPlaced[currentPlayer] < TOTAL_PIECES) {
                placePiece(clickedPoint);
            }
        } 
        else if (phase === 'move') {
            if (selectedPoint === null) {
                if (board[clickedPoint] === currentPlayer) {
                    selectedPoint = clickedPoint;
                    drawBoard();
                }
            } else {
                if (clickedPoint === selectedPoint) {
                    selectedPoint = null;
                    drawBoard();
                } else {
                    movePiece(selectedPoint, clickedPoint);
                }
            }
        }
    }
    
    // Manipular remoção
    function handleRemoveClick(e) {
        if (!waitingForRemoval) return false;
        
        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        
        const mouseX = (e.clientX - rect.left) * scaleX;
        const mouseY = (e.clientY - rect.top) * scaleY;
        
        let clickedPoint = null;
        let minDist = 25;
        for (let i = 0; i < pointsCoords.length; i++) {
            const p = pointsCoords[i];
            const dx = p.x - mouseX;
            const dy = p.y - mouseY;
            const dist = Math.sqrt(dx*dx + dy*dy);
            if (dist < minDist) {
                minDist = dist;
                clickedPoint = i;
            }
        }
        
        if (clickedPoint !== null) {
            removePiece(clickedPoint);
            drawBoard();
            return true;
        }
        return false;
    }
    
    // Desenhar tabuleiro
    function drawBoard() {
        ctx.clearRect(0, 0, BOARD_SIZE, BOARD_SIZE);
        
        // Fundo rosa claro
        ctx.fillStyle = "#fffafc";
        ctx.fillRect(0, 0, BOARD_SIZE, BOARD_SIZE);
        
        // Desenhar linhas (arestas)
        ctx.beginPath();
        ctx.strokeStyle = "#E87A9E";
        ctx.lineWidth = 3;
        ctx.shadowBlur = 0;
        
        for (const edge of edges) {
            const p1 = pointsCoords[edge[0]];
            const p2 = pointsCoords[edge[1]];
            ctx.beginPath();
            ctx.moveTo(p1.x, p1.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.stroke();
        }
        
        // Desenhar pontos e peças
        for (let i = 0; i < pointsCoords.length; i++) {
            const p = pointsCoords[i];
            
            // Destaque para ponto selecionado
            if (selectedPoint === i) {
                ctx.beginPath();
                ctx.arc(p.x, p.y, 22, 0, Math.PI * 2);
                ctx.fillStyle = "#FFE0ED";
                ctx.fill();
                ctx.shadowBlur = 8;
                ctx.shadowColor = "#FFB7D0";
            }
            
            const piece = board[i];
            
            if (piece === 'P1') {
                // Peça do jogador 1 - rosa intenso
                ctx.beginPath();
                ctx.arc(p.x, p.y, 20, 0, Math.PI * 2);
                ctx.fillStyle = PLAYER1_COLOR;
                ctx.fill();
                ctx.strokeStyle = "#B32D54";
                ctx.lineWidth = 2.5;
                ctx.stroke();
                
                // Brilho interno
                ctx.beginPath();
                ctx.arc(p.x - 3, p.y - 3, 4, 0, Math.PI * 2);
                ctx.fillStyle = "rgba(255,255,255,0.4)";
                ctx.fill();
                
                ctx.fillStyle = "white";
                ctx.font = "bold 24px 'Segoe UI Emoji'";
                ctx.textAlign = "center";
                ctx.textBaseline = "middle";
                ctx.fillText("🌸", p.x, p.y);
            } 
            else if (piece === 'P2') {
                // Peça do jogador 2 - rosa claro
                ctx.beginPath();
                ctx.arc(p.x, p.y, 20, 0, Math.PI * 2);
                ctx.fillStyle = PLAYER2_COLOR;
                ctx.fill();
                ctx.strokeStyle = "#E87A9E";
                ctx.lineWidth = 2.5;
                ctx.stroke();
                
                ctx.beginPath();
                ctx.arc(p.x - 3, p.y - 3, 4, 0, Math.PI * 2);
                ctx.fillStyle = "rgba(255,255,255,0.5)";
                ctx.fill();
                
                ctx.fillStyle = "#B54A73";
                ctx.font = "bold 24px 'Segoe UI Emoji'";
                ctx.textAlign = "center";
                ctx.textBaseline = "middle";
                ctx.fillText("💖", p.x, p.y);
            } else {
                // Ponto vazio
                ctx.beginPath();
                ctx.arc(p.x, p.y, 12, 0, Math.PI * 2);
                ctx.fillStyle = "#FFE0EB";
                ctx.fill();
                ctx.strokeStyle = "#F5A9C4";
                ctx.lineWidth = 2;
                ctx.stroke();
                
                ctx.beginPath();
                ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
                ctx.fillStyle = "#F5B0CB";
                ctx.fill();
            }
        }
        
        ctx.shadowBlur = 0;
    }
    
    // Atualizar interface
    function updateUI() {
        const turnPlayer = document.getElementById('turnPlayer');
        const turnPiece = document.getElementById('turnPiece');
        const gameStatus = document.querySelector('.status-text');
        const player1Card = document.getElementById('player1Card');
        const player2Card = document.getElementById('player2Card');
        const player1Pieces = document.getElementById('player1Pieces');
        const player2Pieces = document.getElementById('player2Pieces');
        
        // Atualizar contagem de peças
        player1Pieces.textContent = `${piecesPlaced.P1} / ${TOTAL_PIECES}`;
        player2Pieces.textContent = `${piecesPlaced.P2} / ${TOTAL_PIECES}`;
        
        // Destacar jogador ativo
        if (currentPlayer === 'P1') {
            player1Card.classList.add('active');
            player2Card.classList.remove('active');
        } else {
            player2Card.classList.add('active');
            player1Card.classList.remove('active');
        }
        
        const playerName = currentPlayer === 'P1' ? 'Jogador 1' : 'Jogador 2';
        const playerIcon = currentPlayer === 'P1' ? '🌸' : '💖';
        
        turnPlayer.textContent = playerName;
        turnPiece.textContent = playerIcon;
        
        if (waitingForRemoval) {
            gameStatus.textContent = `🗑️ ${playerName}, remova uma peça adversária!`;
        } 
        else if (phase === 'place') {
            const remaining = TOTAL_PIECES - piecesPlaced[currentPlayer];
            gameStatus.textContent = `📍 Fase de Posicionamento · Coloque sua peça (${remaining} restantes)`;
        } 
        else if (phase === 'move') {
            gameStatus.textContent = `♟️ Fase de Movimento · Mova uma de suas peças`;
        }
    }
    
    // Resetar jogo
    function resetGame() {
        board.fill(null);
        currentPlayer = 'P1';
        phase = 'place';
        piecesPlaced = { P1: 0, P2: 0 };
        selectedPoint = null;
        waitingForRemoval = false;
        currentMills = [];
        updateUI();
        drawBoard();
    }
    
    // Event listeners
    canvas.addEventListener('click', (e) => {
        if (waitingForRemoval) {
            handleRemoveClick(e);
        } else {
            handleCanvasClick(e);
        }
    });
    
    document.getElementById('resetButton').addEventListener('click', () => {
        resetGame();
    });
    
    // Inicializar
    resetGame();
    drawBoard();
})();