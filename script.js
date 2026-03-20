(function() {
    const BOARD_SIZE = 600;
    const PADDING = 60;
    
    // Pontos do tabuleiro de trilha original (3 quadrados concêntricos com 8 pontos cada = 24 pontos)
    const pointsCoords = [];
    
    // Definir os 3 quadrados concêntricos
    const squares = [
        { size: 420, name: 'outer' },   // quadrado externo
        { size: 280, name: 'middle' },  // quadrado médio
        { size: 140, name: 'inner' }    // quadrado interno
    ];
    
    // Gerar pontos para cada quadrado (4 cantos + 4 pontos médios = 8 pontos por quadrado)
    squares.forEach((square, squareIdx) => {
        const center = BOARD_SIZE / 2;
        const halfSize = square.size / 2;
        
        // Pontos nos cantos
        const corners = [
            { x: center - halfSize, y: center - halfSize }, // topo esquerdo
            { x: center + halfSize, y: center - halfSize }, // topo direito
            { x: center + halfSize, y: center + halfSize }, // inferior direito
            { x: center - halfSize, y: center + halfSize }  // inferior esquerdo
        ];
        
        // Pontos nos meios dos lados
        const midPoints = [
            { x: center, y: center - halfSize },             // topo meio
            { x: center + halfSize, y: center },             // direita meio
            { x: center, y: center + halfSize },             // inferior meio
            { x: center - halfSize, y: center }              // esquerda meio
        ];
        
        // Adicionar na ordem: cantos e depois meios
        corners.forEach(corner => pointsCoords.push(corner));
        midPoints.forEach(mid => pointsCoords.push(mid));
    });
    
    // Definir as conexões (arestas) do tabuleiro
    const edges = [];
    
    // Conexões dentro de cada quadrado
    for (let square = 0; square < 3; square++) {
        const startIdx = square * 8;
        
        // Conexões entre pontos consecutivos no quadrado
        for (let i = 0; i < 7; i++) {
            edges.push([startIdx + i, startIdx + i + 1]);
        }
        // Fechar o quadrado (último com primeiro)
        edges.push([startIdx + 7, startIdx]);
        
        // Conexões especiais: canto com canto oposto (diagonais dos quadrados)
        edges.push([startIdx, startIdx + 2]);     // canto superior esq -> canto superior dir
        edges.push([startIdx + 2, startIdx + 4]); // canto superior dir -> canto inferior dir
        edges.push([startIdx + 4, startIdx + 6]); // canto inferior dir -> canto inferior esq
        edges.push([startIdx + 6, startIdx]);     // canto inferior esq -> canto superior esq
    }
    
    // Conexões entre quadrados (radiais)
    for (let i = 0; i < 8; i++) {
        // Conectar quadrado externo com médio
        edges.push([i, i + 8]);
        // Conectar quadrado médio com interno
        edges.push([i + 8, i + 16]);
    }
    
    // Conexões entre cantos opostos dos quadrados (formando X)
    edges.push([0, 4]);   // canto sup esq externo -> canto sup dir externo
    edges.push([4, 8]);   // canto sup dir externo -> canto sup dir médio
    edges.push([2, 6]);   // canto sup dir externo -> canto inf dir externo
    edges.push([6, 10]);  // canto inf dir externo -> canto inf dir médio
    edges.push([1, 5]);   // meio sup externo -> meio dir externo
    edges.push([5, 9]);   // meio dir externo -> meio dir médio
    
    // Combinações de trilhas (3 pontos em linha reta)
    const millCombinations = [
        // Linhas horizontais do quadrado externo
        [0, 1, 2], [2, 3, 4], [4, 5, 6], [6, 7, 0],
        // Linhas horizontais do quadrado médio
        [8, 9, 10], [10, 11, 12], [12, 13, 14], [14, 15, 8],
        // Linhas horizontais do quadrado interno
        [16, 17, 18], [18, 19, 20], [20, 21, 22], [22, 23, 16],
        
        // Linhas verticais
        [0, 8, 16], [2, 10, 18], [4, 12, 20], [6, 14, 22],
        [1, 9, 17], [3, 11, 19], [5, 13, 21], [7, 15, 23],
        
        // Diagonais
        [0, 9, 18], [2, 11, 20], [4, 13, 22], [6, 15, 16],
        [1, 10, 19], [3, 12, 21], [5, 14, 23], [7, 8, 17]
    ];
    
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
        for (const combo of millCombinations) {
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
        for (const combo of millCombinations) {
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
            alert(`🎉 ${winnerName} venceu o jogo! 🎉`);
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
        ctx.fillStyle = "#fff8fb";
        ctx.fillRect(0, 0, BOARD_SIZE, BOARD_SIZE);
        
        // Desenhar linhas do tabuleiro
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
        
        // Desenhar os quadrados concêntricos (para dar ênfase)
        ctx.beginPath();
        ctx.strokeStyle = "#F5A9C4";
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 5]);
        
        const center = BOARD_SIZE / 2;
        [210, 140, 70].forEach(size => {
            ctx.beginPath();
            ctx.rect(center - size, center - size, size * 2, size * 2);
            ctx.stroke();
        });
        
        ctx.setLineDash([]);
        
        // Desenhar pontos e peças
        for (let i = 0; i < pointsCoords.length; i++) {
            const p = pointsCoords[i];
            
            // Destaque para ponto selecionado
            if (selectedPoint === i) {
                ctx.beginPath();
                ctx.arc(p.x, p.y, 24, 0, Math.PI * 2);
                ctx.fillStyle = "#FFE0ED";
                ctx.fill();
                ctx.shadowBlur = 10;
                ctx.shadowColor = "#FFB7D0";
            }
            
            const piece = board[i];
            
            if (piece === 'P1') {
                ctx.beginPath();
                ctx.arc(p.x, p.y, 20, 0, Math.PI * 2);
                ctx.fillStyle = PLAYER1_COLOR;
                ctx.fill();
                ctx.strokeStyle = "#B32D54";
                ctx.lineWidth = 2.5;
                ctx.stroke();
                
                // Brilho
                ctx.beginPath();
                ctx.arc(p.x - 3, p.y - 3, 5, 0, Math.PI * 2);
                ctx.fillStyle = "rgba(255,255,255,0.4)";
                ctx.fill();
                
                ctx.fillStyle = "white";
                ctx.font = "bold 24px 'Segoe UI Emoji'";
                ctx.textAlign = "center";
                ctx.textBaseline = "middle";
                ctx.fillText("🌸", p.x, p.y);
            } 
            else if (piece === 'P2') {
                ctx.beginPath();
                ctx.arc(p.x, p.y, 20, 0, Math.PI * 2);
                ctx.fillStyle = PLAYER2_COLOR;
                ctx.fill();
                ctx.strokeStyle = "#E87A9E";
                ctx.lineWidth = 2.5;
                ctx.stroke();
                
                ctx.beginPath();
                ctx.arc(p.x - 3, p.y - 3, 5, 0, Math.PI * 2);
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
                ctx.arc(p.x, p.y, 5, 0, Math.PI * 2);
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
            statusText.textContent = `🗑️ ${playerName}, remova uma peça do oponente!`;
        } 
        else if (phase === 'place') {
            const remaining = TOTAL_PIECES - piecesPlaced[currentPlayer];
            statusText.textContent = `📍 Posicione sua peça (${remaining} restantes)`;
        } 
        else if (phase === 'move') {
            statusText.textContent = `♟️ Mova uma de suas peças`;
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