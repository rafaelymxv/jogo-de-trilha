(function(){
    // ------------------- CONFIGURAÇÕES ROSA -------------------
    const BOARD_SIZE = 600;
    
    // Pontos do tabuleiro de trilha clássico (24 pontos)
    const pointsCoords = [
        // Anel externo (começando do topo, sentido horário)
        {x: 300, y: 40},   // 0 - topo externo
        {x: 420, y: 80},   // 1
        {x: 520, y: 160},  // 2
        {x: 560, y: 300},  // 3
        {x: 520, y: 440},  // 4
        {x: 420, y: 520},  // 5
        {x: 300, y: 560},  // 6 - base externa
        {x: 180, y: 520},  // 7
        {x: 80, y: 440},   // 8
        {x: 40, y: 300},   // 9
        {x: 80, y: 160},   // 10
        {x: 180, y: 80},   // 11
        // Anel médio
        {x: 300, y: 120},  // 12
        {x: 380, y: 160},  // 13
        {x: 440, y: 240},  // 14
        {x: 480, y: 300},  // 15
        {x: 440, y: 360},  // 16
        {x: 380, y: 440},  // 17
        {x: 300, y: 480},  // 18
        {x: 220, y: 440},  // 19
        {x: 160, y: 360},  // 20
        {x: 120, y: 300},  // 21
        {x: 160, y: 240},  // 22
        {x: 220, y: 160}   // 23
    ];

    // Definição das trilhas (arestas) - conectividade clássica do jogo de trilha
    const edges = [
        // Anel externo
        [0,1],[1,2],[2,3],[3,4],[4,5],[5,6],[6,7],[7,8],[8,9],[9,10],[10,11],[11,0],
        // Anel médio
        [12,13],[13,14],[14,15],[15,16],[16,17],[17,18],[18,19],[19,20],[20,21],[21,22],[22,23],[23,12],
        // Ligações radiais entre anéis
        [0,12], [1,13], [2,14], [3,15], [4,16], [5,17], [6,18], [7,19], [8,20], [9,21], [10,22], [11,23]
    ];

    // Todas as combinações de trilhas (mill) pré-definidas
    const millCombinations = [
        // Anel externo
        [0,1,2], [2,3,4], [4,5,6], [6,7,8], [8,9,10], [10,11,0],
        // Anel médio
        [12,13,14], [14,15,16], [16,17,18], [18,19,20], [20,21,22], [22,23,12],
        // Radiais (externo + médio)
        [0,12,23], [1,13,22], [2,14,21], [3,15,20], [4,16,19], [5,17,18], 
        [6,18,17], [7,19,16], [8,20,15], [9,21,14], [10,22,13], [11,23,12]
    ];

    const PLAYER1_COLOR = "#E8436E";
    const PLAYER2_COLOR = "#FFA5C0";
    const PLAYER1_STROKE = "#B32D54";
    const PLAYER2_STROKE = "#E87A9E";
    
    let canvas = document.getElementById('gameCanvas');
    let ctx = canvas.getContext('2d');
    
    // Ajustar tamanho do canvas para保持 proporção
    function resizeCanvas() {
        const container = canvas.parentElement;
        const size = Math.min(container.clientWidth, 600);
        canvas.style.width = `${size}px`;
        canvas.style.height = `${size}px`;
    }
    window.addEventListener('resize', resizeCanvas);
    resizeCanvas();

    // Estado do jogo
    let board = Array(24).fill(null);
    let currentPlayer = 'P1';
    let phase = 'place';
    let piecesPlaced = { P1: 0, P2: 0 };
    const TOTAL_PIECES = 9;
    
    let selectedPoint = null;
    let waitingForRemoval = false;
    let currentMills = [];

    // Helper: verifica se um ponto específico faz parte de uma mill
    function getMillsForPlayer(player) {
        const mills = [];
        for (const combo of millCombinations) {
            if (combo.every(idx => board[idx] === player)) {
                mills.push(combo);
            }
        }
        return mills;
    }

    // Verifica se uma jogada (colocar ou mover) criou uma mill
    function checkAndHandleMill(pointIdx, player) {
        const newMills = [];
        for (const combo of millCombinations) {
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

    // Obtém todas as peças do oponente que podem ser removidas (não podem estar em mills a menos que todas estejam)
    function getRemovablePieces(opponent) {
        const opponentIndices = [];
        for (let i = 0; i < board.length; i++) {
            if (board[i] === opponent) opponentIndices.push(i);
        }
        
        if (opponentIndices.length === 0) return [];
        
        // Encontrar mills do oponente
        const opponentMills = getMillsForPlayer(opponent);
        const piecesInMills = new Set();
        opponentMills.forEach(mill => {
            mill.forEach(idx => piecesInMills.add(idx));
        });
        
        // Se todas as peças do oponente estão em mills, pode remover qualquer uma
        if (piecesInMills.size === opponentIndices.length) {
            return opponentIndices;
        }
        
        // Caso contrário, só pode remover peças que não estão em mills
        return opponentIndices.filter(idx => !piecesInMills.has(idx));
    }

    // Remove uma peça do oponente
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
        
        // Após remover, mudar de turno
        waitingForRemoval = false;
        currentMills = [];
        
        // Mudar de jogador
        switchPlayer();
        updateUI();
        drawBoard();
        return true;
    }

    // Finalizar jogo
    function endGame(winner) {
        const winnerName = winner === 'P1' ? 'Jogador 1 🌸' : 'Jogador 2 💖';
        alert(`🎉 ${winnerName} venceu o jogo! 🎉\nClique em "Novo Jogo" para jogar novamente.`);
        resetGame();
    }

    // Colocar peça na fase de posicionamento
    function placePiece(pointIdx) {
        if (board[pointIdx] !== null) return false;
        
        board[pointIdx] = currentPlayer;
        piecesPlaced[currentPlayer]++;
        
        // Verificar se formou mill
        const formedMill = checkAndHandleMill(pointIdx, currentPlayer);
        
        if (!formedMill) {
            // Se não formou mill, troca de jogador
            if (piecesPlaced[currentPlayer] === TOTAL_PIECES && piecesPlaced[getOpponent()] === TOTAL_PIECES) {
                // Mudar para fase de movimento quando todos colocaram
                phase = 'move';
                updateUI();
            }
            switchPlayer();
        }
        
        updateUI();
        drawBoard();
        return true;
    }

    // Mover peça (fase de movimento)
    function movePiece(fromIdx, toIdx) {
        if (board[fromIdx] !== currentPlayer) return false;
        if (board[toIdx] !== null) return false;
        
        // Verificar se é movimento válido (adjacente)
        const isValidMove = edges.some(edge => 
            (edge[0] === fromIdx && edge[1] === toIdx) || 
            (edge[1] === fromIdx && edge[0] === toIdx)
        );
        
        if (!isValidMove) return false;
        
        // Realizar movimento
        board[fromIdx] = null;
        board[toIdx] = currentPlayer;
        
        // Verificar se formou mill
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
        
        // Verificar se o jogador atual não tem movimentos possíveis (apenas na fase de movimento)
        if (phase === 'move') {
            const hasMoves = checkPlayerHasMoves(currentPlayer);
            if (!hasMoves) {
                const winner = currentPlayer === 'P1' ? 'P2' : 'P1';
                endGame(winner);
            }
        }
    }

    // Verificar se jogador tem movimentos disponíveis
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

    // Manipular clique no canvas
    function handleCanvasClick(e) {
        if (waitingForRemoval) return;
        
        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        
        const mouseX = (e.clientX - rect.left) * scaleX;
        const mouseY = (e.clientY - rect.top) * scaleY;
        
        // Encontrar ponto clicado
        let clickedPoint = null;
        for (let i = 0; i < pointsCoords.length; i++) {
            const p = pointsCoords[i];
            const dx = p.x - mouseX;
            const dy = p.y - mouseY;
            const dist = Math.sqrt(dx*dx + dy*dy);
            if (dist < 20) {
                clickedPoint = i;
                break;
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
                // Selecionar peça
                if (board[clickedPoint] === currentPlayer) {
                    selectedPoint = clickedPoint;
                    drawBoard();
                    setTimeout(() => {
                        drawBoard();
                    }, 100);
                }
            } else {
                // Tentar mover
                if (clickedPoint === selectedPoint) {
                    selectedPoint = null;
                    drawBoard();
                } else {
                    movePiece(selectedPoint, clickedPoint);
                }
            }
        }
    }
    
    // Remover peça (quando em fase de remoção)
    function handleRemoveClick(e) {
        if (!waitingForRemoval) return false;
        
        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        
        const mouseX = (e.clientX - rect.left) * scaleX;
        const mouseY = (e.clientY - rect.top) * scaleY;
        
        let clickedPoint = null;
        for (let i = 0; i < pointsCoords.length; i++) {
            const p = pointsCoords[i];
            const dx = p.x - mouseX;
            const dy = p.y - mouseY;
            const dist = Math.sqrt(dx*dx + dy*dy);
            if (dist < 20) {
                clickedPoint = i;
                break;
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
        
        // Desenhar linhas (trilhas)
        ctx.beginPath();
        ctx.strokeStyle = "#E87A9E";
        ctx.lineWidth = 5;
        ctx.shadowBlur = 0;
        
        for (const edge of edges) {
            const p1 = pointsCoords[edge[0]];
            const p2 = pointsCoords[edge[1]];
            ctx.beginPath();
            ctx.moveTo(p1.x, p1.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.stroke();
        }
        
        // Desenhar pontos
        for (let i = 0; i < pointsCoords.length; i++) {
            const p = pointsCoords[i];
            
            // Destaque para ponto selecionado
            if (selectedPoint === i) {
                ctx.beginPath();
                ctx.arc(p.x, p.y, 22, 0, Math.PI * 2);
                ctx.fillStyle = "#FFB7D2";
                ctx.fill();
                ctx.shadowBlur = 8;
                ctx.shadowColor = "#FF69B4";
            }
            
            // Desenhar peças
            const piece = board[i];
            if (piece === 'P1') {
                ctx.beginPath();
                ctx.arc(p.x, p.y, 18, 0, Math.PI * 2);
                ctx.fillStyle = PLAYER1_COLOR;
                ctx.fill();
                ctx.strokeStyle = PLAYER1_STROKE;
                ctx.lineWidth = 2;
                ctx.stroke();
                ctx.fillStyle = "white";
                ctx.font = "bold 20px 'Segoe UI'";
                ctx.textAlign = "center";
                ctx.textBaseline = "middle";
                ctx.fillText("🌸", p.x, p.y);
            } 
            else if (piece === 'P2') {
                ctx.beginPath();
                ctx.arc(p.x, p.y, 18, 0, Math.PI * 2);
                ctx.fillStyle = PLAYER2_COLOR;
                ctx.fill();
                ctx.strokeStyle = PLAYER2_STROKE;
                ctx.lineWidth = 2;
                ctx.stroke();
                ctx.fillStyle = "#B54A73";
                ctx.font = "bold 20px 'Segoe UI'";
                ctx.textAlign = "center";
                ctx.textBaseline = "middle";
                ctx.fillText("💖", p.x, p.y);
            }
            
            // Desenhar ponto vazio
            if (!piece) {
                ctx.beginPath();
                ctx.arc(p.x, p.y, 12, 0, Math.PI * 2);
                ctx.fillStyle = "#FFB7C5";
                ctx.fill();
                ctx.strokeStyle = "#E87A9E";
                ctx.lineWidth = 2;
                ctx.stroke();
            }
        }
        
        ctx.shadowBlur = 0;
    }
    
    // Atualizar interface
    function updateUI() {
        const turnText = document.getElementById('turnText');
        const statusMsg = document.getElementById('statusMsg');
        const phaseBadge = document.getElementById('phaseBadge');
        
        const playerName = currentPlayer === 'P1' ? 'Jogador 1 🌸' : 'Jogador 2 💖';
        
        if (waitingForRemoval) {
            turnText.innerText = playerName;
            statusMsg.innerText = `✨ ${playerName}, remova uma peça adversária! ✨`;
            phaseBadge.innerText = `🗑️ Remova uma peça`;
        } 
        else if (phase === 'place') {
            turnText.innerText = playerName;
            const remaining = TOTAL_PIECES - piecesPlaced[currentPlayer];
            statusMsg.innerText = `📍 Coloque sua peça (restam ${remaining})`;
            phaseBadge.innerText = `📌 Fase de Posicionamento`;
        } 
        else if (phase === 'move') {
            turnText.innerText = playerName;
            statusMsg.innerText = `♟️ Mova uma de suas peças`;
            phaseBadge.innerText = `🚀 Fase de Movimento`;
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