(function() {
    const BOARD_SIZE = 600;
    const MARGIN = 80;
    const CELL_SIZE = (BOARD_SIZE - MARGIN * 2) / 8;
    
    // Pontos do tabuleiro - estilo trilha clássica (24 pontos)
    // Layout baseado no formato tradicional do jogo de trilha
    const pointsCoords = [
        // Canto superior esquerdo (quadrado externo)
        {x: MARGIN, y: MARGIN},                          // 0
        {x: MARGIN + CELL_SIZE * 2, y: MARGIN},          // 1
        {x: MARGIN + CELL_SIZE * 4, y: MARGIN},          // 2
        {x: MARGIN + CELL_SIZE * 6, y: MARGIN},          // 3
        {x: MARGIN + CELL_SIZE * 8, y: MARGIN},          // 4
        
        // Lado direito
        {x: MARGIN + CELL_SIZE * 8, y: MARGIN + CELL_SIZE * 2}, // 5
        {x: MARGIN + CELL_SIZE * 8, y: MARGIN + CELL_SIZE * 4}, // 6
        {x: MARGIN + CELL_SIZE * 8, y: MARGIN + CELL_SIZE * 6}, // 7
        {x: MARGIN + CELL_SIZE * 8, y: MARGIN + CELL_SIZE * 8}, // 8
        
        // Canto inferior direito
        {x: MARGIN + CELL_SIZE * 6, y: MARGIN + CELL_SIZE * 8}, // 9
        {x: MARGIN + CELL_SIZE * 4, y: MARGIN + CELL_SIZE * 8}, // 10
        {x: MARGIN + CELL_SIZE * 2, y: MARGIN + CELL_SIZE * 8}, // 11
        {x: MARGIN, y: MARGIN + CELL_SIZE * 8},                 // 12
        
        // Lado esquerdo
        {x: MARGIN, y: MARGIN + CELL_SIZE * 6},                 // 13
        {x: MARGIN, y: MARGIN + CELL_SIZE * 4},                 // 14
        {x: MARGIN, y: MARGIN + CELL_SIZE * 2},                 // 15
        
        // Quadrado interno
        {x: MARGIN + CELL_SIZE * 2, y: MARGIN + CELL_SIZE * 2}, // 16
        {x: MARGIN + CELL_SIZE * 4, y: MARGIN + CELL_SIZE * 2}, // 17
        {x: MARGIN + CELL_SIZE * 6, y: MARGIN + CELL_SIZE * 2}, // 18
        {x: MARGIN + CELL_SIZE * 6, y: MARGIN + CELL_SIZE * 4}, // 19
        {x: MARGIN + CELL_SIZE * 6, y: MARGIN + CELL_SIZE * 6}, // 20
        {x: MARGIN + CELL_SIZE * 4, y: MARGIN + CELL_SIZE * 6}, // 21
        {x: MARGIN + CELL_SIZE * 2, y: MARGIN + CELL_SIZE * 6}, // 22
        {x: MARGIN + CELL_SIZE * 2, y: MARGIN + CELL_SIZE * 4}  // 23
    ];
    
    // Conexões entre os pontos (arestas do tabuleiro)
    const edges = [
        // Quadrado externo (superior)
        [0,1], [1,2], [2,3], [3,4],
        // Lado direito
        [4,5], [5,6], [6,7], [7,8],
        // Quadrado externo (inferior)
        [8,9], [9,10], [10,11], [11,12],
        // Lado esquerdo
        [12,13], [13,14], [14,15], [15,0],
        
        // Quadrado interno
        [16,17], [17,18], [18,19], [19,20], [20,21], [21,22], [22,23], [23,16],
        
        // Conexões entre quadrados (externo -> interno)
        [1,17], [2,18], [3,19],
        [5,18], [6,19], [7,20],
        [9,21], [10,22], [11,23],
        [13,22], [14,23], [15,16],
        
        // Conexões diagonais/internas
        [0,16], [4,18], [8,20], [12,22]
    ];
    
    // Combinações de trilhas (3 pontos em linha reta)
    const millCombinations = [
        // Linhas horizontais do quadrado externo
        [0,1,2,3,4],
        [4,5,6,7,8],
        [8,9,10,11,12],
        [12,13,14,15,0],
        
        // Linhas horizontais do quadrado interno
        [16,17,18,19,20,21,22,23,16],
        
        // Linhas verticais e diagonais para formar trilhas de 3
        [0,15,14], [1,17,23], [2,18,22], [3,19,21], [4,5,6],
        [4,3,2], [8,7,6], [8,9,10], [12,11,10], [12,13,14],
        [16,23,22], [16,17,18], [18,19,20], [20,21,22]
    ];
    
    // Filtrar para apenas combinações de 3 pontos
    const validMills = [];
    for (const combo of millCombinations) {
        for (let i = 0; i <= combo.length - 3; i++) {
            validMills.push([combo[i], combo[i+1], combo[i+2]]);
        }
    }
    
    const PLAYER1_COLOR = "#E8436E";
    const PLAYER2_COLOR = "#FFA5C0";
    
    let canvas = document.getElementById('gameCanvas');
    let ctx = canvas.getContext('2d');
    
    // Estado do jogo
    let board = Array(24).fill(null);
    let currentPlayer = 'P1';
    let phase = 'place';
    let piecesPlaced = { P1: 0, P2: 0 };
    const TOTAL_PIECES = 9;
    
    let selectedPoint = null;
    let waitingForRemoval = false;
    
    // Verificar se 3 pontos formam uma trilha
    function isMill(p1, p2, p3, player) {
        return board[p1] === player && board[p2] === player && board[p3] === player;
    }
    
    // Encontrar todas as trilhas formadas por um ponto
    function getMillsForPoint(pointIdx, player) {
        const mills = [];
        for (const combo of validMills) {
            if (combo.includes(pointIdx) && combo.every(idx => board[idx] === player)) {
                mills.push(combo);
            }
        }
        return mills;
    }
    
    // Verificar e lidar com trilha
    function checkAndHandleMill(pointIdx, player) {
        const mills = getMillsForPoint(pointIdx, player);
        if (mills.length > 0) {
            waitingForRemoval = true;
            phase = 'remove';
            updateUI();
            drawBoard();
            return true;
        }
        return false;
    }
    
    // Obter peças removíveis do oponente
    function getRemovablePieces(opponent) {
        const opponentIndices = [];
        for (let i = 0; i < board.length; i++) {
            if (board[i] === opponent) opponentIndices.push(i);
        }
        
        if (opponentIndices.length === 0) return [];
        
        // Encontrar peças que estão em trilhas
        const piecesInMills = new Set();
        for (const combo of validMills) {
            if (combo.every(idx => board[idx] === opponent)) {
                combo.forEach(idx => piecesInMills.add(idx));
            }
        }
        
        // Se todas as peças estão em trilhas, pode remover qualquer uma
        if (piecesInMills.size === opponentIndices.length) {
            return opponentIndices;
        }
        
        // Caso contrário, só remove peças que não estão em trilhas
        return opponentIndices.filter(idx => !piecesInMills.has(idx));
    }
    
    // Remover peça
    function removePiece(pointIdx) {
        const opponent = currentPlayer === 'P1' ? 'P2' : 'P1';
        if (board[pointIdx] !== opponent) return false;
        
        const removable = getRemovablePieces(opponent);
        if (!removable.includes(pointIdx)) return false;
        
        board[pointIdx] = null;
        
        const remainingOpponent = board.filter(p => p === opponent).length;
        if (remainingOpponent < 3) {
            endGame(currentPlayer);
            return true;
        }
        
        waitingForRemoval = false;
        switchPlayer();
        updateUI();
        drawBoard();
        return true;
    }
    
    // Finalizar jogo
    function endGame(winner) {
        const winnerName = winner === 'P1' ? 'Jogador 1 🌸' : 'Jogador 2 💖';
        setTimeout(() => {
            alert(`🎉 ${winnerName} venceu! 🎉`);
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
        let minDist = 20;
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
        let minDist = 20;
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
        ctx.fillStyle = "#fff5f9";
        ctx.fillRect(0, 0, BOARD_SIZE, BOARD_SIZE);
        
        // Desenhar linhas
        ctx.beginPath();
        ctx.strokeStyle = "#E87A9E";
        ctx.lineWidth = 3;
        
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
            }
            
            const piece = board[i];
            
            if (piece === 'P1') {
                ctx.beginPath();
                ctx.arc(p.x, p.y, 18, 0, Math.PI * 2);
                ctx.fillStyle = PLAYER1_COLOR;
                ctx.fill();
                ctx.strokeStyle = "#B32D54";
                ctx.lineWidth = 2;
                ctx.stroke();
                ctx.fillStyle = "white";
                ctx.font = "bold 22px 'Segoe UI Emoji'";
                ctx.textAlign = "center";
                ctx.textBaseline = "middle";
                ctx.fillText("🌸", p.x, p.y);
            } 
            else if (piece === 'P2') {
                ctx.beginPath();
                ctx.arc(p.x, p.y, 18, 0, Math.PI * 2);
                ctx.fillStyle = PLAYER2_COLOR;
                ctx.fill();
                ctx.strokeStyle = "#E87A9E";
                ctx.lineWidth = 2;
                ctx.stroke();
                ctx.fillStyle = "#B54A73";
                ctx.font = "bold 22px 'Segoe UI Emoji'";
                ctx.textAlign = "center";
                ctx.textBaseline = "middle";
                ctx.fillText("💖", p.x, p.y);
            } else {
                ctx.beginPath();
                ctx.arc(p.x, p.y, 10, 0, Math.PI * 2);
                ctx.fillStyle = "#FFD0E2";
                ctx.fill();
                ctx.strokeStyle = "#F5A9C4";
                ctx.lineWidth = 1.5;
                ctx.stroke();
            }
        }
    }
    
    // Atualizar interface
    function updateUI() {
        const turnPlayer = document.getElementById('turnPlayer');
        const turnPiece = document.getElementById('turnPiece');
        const statusText = document.querySelector('.status-text');
        const player1Card = document.getElementById('player1Card');
        const player2Card = document.getElementById('player2Card');
        const player1Pieces = document.getElementById('player1Pieces');
        const player2Pieces = document.getElementById('player2Pieces');
        
        player1Pieces.textContent = `${piecesPlaced.P1} / ${TOTAL_PIECES}`;
        player2Pieces.textContent = `${piecesPlaced.P2} / ${TOTAL_PIECES}`;
        
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
            statusText.textContent = `🗑️ ${playerName}, remova uma peça!`;
        } 
        else if (phase === 'place') {
            const remaining = TOTAL_PIECES - piecesPlaced[currentPlayer];
            statusText.textContent = `📍 Coloque sua peça (${remaining} restam)`;
        } 
        else if (phase === 'move') {
            statusText.textContent = `♟️ Mova uma peça`;
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
})();