document.addEventListener("DOMContentLoaded", () => {
  const boardElement = document.getElementById("chessboard");
  const game = new Chess(); // Create a new chess game instance

  const config = {
    draggable: true,
    dropOffBoard: 'snapback',
    position: 'start',
    onDragStart,
    onDrop
  }
  
  const board = Chessboard2(boardElement, config);

  const statusEl = byId('gameStatus')
  const fenEl = byId('gameFEN')
  const pgnEl = byId('gamePGN')
  const playerColor = document.querySelector('input[name="color"]:checked').value;

  updateStatus()

  function handleMove(source, target) {
      const move = game.move({
          from: source,
          to: target,
          promotion: "q", // Always promote to a queen (simplified)
      });

      if (move === null) return "snapback"; // Invalid move

      // Update the board position after a valid move
      board.position(game.fen());
  }

  function onDragStart (dragStartEvt) {
    // do not pick up pieces if the game is over
    if (game.game_over()) return false
  
    // only pick up pieces for the side to move
    if (game.turn() === 'w' && !isWhitePiece(dragStartEvt.piece)) return false
    if (game.turn() === 'b' && !isBlackPiece(dragStartEvt.piece)) return false
  
    // what moves are available to from this square?
    const legalMoves = game.moves({
      square: dragStartEvt.square,
      verbose: true
    })
  
    // place Circles on the possible target squares
    legalMoves.forEach((move) => {
      board.addCircle(move.to)
    })
  }

  function isWhitePiece (piece) { return /^w/.test(piece) }
  function isBlackPiece (piece) { return /^b/.test(piece) }

  function onDrop (dropEvt) {
    // see if the move is legal
    const move = game.move({
      from: dropEvt.source,
      to: dropEvt.target,
      promotion: 'q' // NOTE: always promote to a queen for example simplicity
    })
  
    // remove all Circles from the board
    board.clearCircles()
  
    // make the move if it is legal
    if (move) {
      // update the board position with the new game position, then update status DOM elements
      board.fen(game.fen(), () => {
        updateStatus()
      })
    } else {
      return 'snapback'
    }
  }

  function updateStatus () {
    let statusHTML = ''
    
    if (playerColor != game.turn()) {
      aiMove();
    }
    const whosTurn = game.turn() === 'w' ? 'White' : 'Black'
  
    if (!game.game_over()) {
      if (game.in_check()) statusHTML = whosTurn + ' is in check! '
      statusHTML = statusHTML + whosTurn + ' to move.'
    } else if (game.in_checkmate() && game.turn() === 'w') {
      statusHTML = 'Game over: white is in checkmate. Black wins!'
    } else if (game.in_checkmate() && game.turn() === 'b') {
      statusHTML = 'Game over: black is in checkmate. White wins!'
    } else if (game.in_stalemate() && game.turn() === 'w') {
      statusHTML = 'Game is drawn. White is stalemated.'
    } else if (game.in_stalemate() && game.turn() === 'b') {
      statusHTML = 'Game is drawn. Black is stalemated.'
    } else if (game.in_threefold_repetition()) {
      statusHTML = 'Game is drawn by threefold repetition rule.'
    } else if (game.insufficient_material()) {
      statusHTML = 'Game is drawn by insufficient material.'
    } else if (game.in_draw()) {
      statusHTML = 'Game is drawn by fifty-move rule.'
    }
  
    statusEl.innerHTML = statusHTML
    fenEl.innerHTML = game.fen()
    pgnEl.innerHTML = game.pgn()
  }
  
  function byId (id) {
    return document.getElementById(id)
  }

  function aiMove() {
    const moves = game.moves();

    if (moves.length === 0) return

    let bestMove = null;
    let highestEval = -Infinity;

    moves.forEach((move) => {
      game.move(move); // Make the move
      const evaluation = eval(); // Evaluate the position
      if (evaluation > highestEval) {
        highestEval = evaluation;
        bestMove = move;
      }
      game.undo(); // Undo the move
    });

    if (bestMove) {
      game.move(bestMove); // Make the best move
      board.position(game.fen()); // Update the board
      updateStatus(); // Update the status
    }
    console.log(highestEval);
  }

  // Evaluation and move picking stuff

  function eval() {
    let whiteScore = 0;
    let blackScore = 0;
    const fen = game.fen().split(" ")[0]; // Get the board state from the FEN string

    for (const char of fen) {
        switch (char) {
            case 'P': whiteScore += 100; break;
            case 'N': whiteScore += 300; break;
            case 'B': whiteScore += 330; break;
            case 'R': whiteScore += 500; break;
            case 'Q': whiteScore += 900; break;
            case 'K': whiteScore += 9000; break;
            case 'p': blackScore += 100; break;
            case 'n': blackScore += 300; break;
            case 'b': blackScore += 330; break;
            case 'r': blackScore += 500; break;
            case 'q': blackScore += 900; break;
            case 'k': blackScore += 9000; break;
            default: break; // Ignore other characters (e.g., numbers or slashes)
        }
    }
    console.log(blackScore - whiteScore);
    return blackScore - whiteScore; // Higher score is better for the AI
  }
});
