document.addEventListener("DOMContentLoaded", () => {
  const boardElement = document.getElementById("chessboard");
  const game = new Chess(); // Create a new chess game instance

  const config = {
    draggable: true,
    dropOffBoard: "snapback",
    position: "start",
    onDragStart,
    onDrop,
  };

  const board = Chessboard2(boardElement, config);

  const statusEl = byId("gameStatus");
  const fenEl = byId("gameFEN");
  const pgnEl = byId("gamePGN");
  const selfPlay = document.querySelector('input[type="checkbox"]').checked;
  console.log("Is self play checked: " + selfPlay);
  const playerColor = document.querySelector(
    'input[name="color"]:checked'
  ).value;
  const boardEval = byId("eval");

  updateStatus();

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

  function onDragStart(dragStartEvt) {
    console.log(eval());
    // do not pick up pieces if the game is over
    if (game.game_over()) return false;

    // only pick up pieces for the side to move
    if (game.turn() === "w" && !isWhitePiece(dragStartEvt.piece)) return false;
    if (game.turn() === "b" && !isBlackPiece(dragStartEvt.piece)) return false;

    // what moves are available to from this square?
    const legalMoves = game.moves({
      square: dragStartEvt.square,
      verbose: true,
    });

    // place Circles on the possible target squares
    legalMoves.forEach((move) => {
      board.addCircle(move.to);
    });
  }

  function isWhitePiece(piece) {
    return /^w/.test(piece);
  }
  function isBlackPiece(piece) {
    return /^b/.test(piece);
  }

  function onDrop(dropEvt) {
    // see if the move is legal
    const move = game.move({
      from: dropEvt.source,
      to: dropEvt.target,
      promotion: "q", // NOTE: always promote to a queen for example simplicity
    });

    // remove all Circles from the board
    board.clearCircles();

    // make the move if it is legal
    if (move) {
      // update the board position with the new game position, then update status DOM elements
      board.fen(game.fen(), () => {
        updateStatus();
      });
    } else {
      return "snapback";
    }
  }

  async function updateStatus() {
    console.table(game.board());
    let statusHTML = "";
    if (selfPlay) {
      await new Promise((r) => setTimeout(r, 1000));
      aiMove();
    } else {
      if (playerColor != game.turn()) {
        aiMove();
      }
    }
    const whosTurn = game.turn() === "w" ? "White" : "Black";

    if (!game.game_over()) {
      if (game.in_check()) statusHTML = whosTurn + " is in check! ";
      statusHTML = statusHTML + whosTurn + " to move.";
    } else if (game.in_checkmate() && game.turn() === "w") {
      statusHTML = "Game over: white is in checkmate. Black wins!";
    } else if (game.in_checkmate() && game.turn() === "b") {
      statusHTML = "Game over: black is in checkmate. White wins!";
    } else if (game.in_stalemate() && game.turn() === "w") {
      statusHTML = "Game is drawn. White is stalemated.";
    } else if (game.in_stalemate() && game.turn() === "b") {
      statusHTML = "Game is drawn. Black is stalemated.";
    } else if (game.in_threefold_repetition()) {
      statusHTML = "Game is drawn by threefold repetition rule.";
    } else if (game.insufficient_material()) {
      statusHTML = "Game is drawn by insufficient material.";
    } else if (game.in_draw()) {
      statusHTML = "Game is drawn by fifty-move rule.";
    }

    statusEl.innerHTML = statusHTML;
    fenEl.innerHTML = game.fen();
    pgnEl.innerHTML = game.pgn();
    boardEval.innerText = eval() / 10;
  }

  function gameOver() {
    return game.in_checkmate();
  }
  function minimax(depth, isMaximizingPlayer) {
    const moves = game.moves();
    if (depth == 0 || !game.moves()) {
      return { score: eval(), move: null };
    }

    let bestMove = null;
    if (isMaximizingPlayer) {
      let val = -Infinity;
      moves.forEach((move) => {
        game.move(move);
        const result = minimax(depth - 1, false);
        game.undo();
        if (result.score > val) {
          val = result.score;
          bestMove = move;
        }
      });
      return { score: val, move: bestMove };
    } else {
      let val = Infinity;
      moves.forEach((move) => {
        game.move(move);
        const result = minimax(depth - 1, true);
        game.undo();

        if (result.score < val) {
          val = result.score;
          bestMove = move;
        }
      });
      return { score: val, move: bestMove };
    }
  }

  function byId(id) {
    return document.getElementById(id);
  }
  let moveTimes = [];
  function aiMove() {
    let startTime = performance.now();
    const searchDepth = 3;
    const moves = game.moves();
    if (moves.length === 0) return;

    let bestMove = minimax(searchDepth, game.turn() === "w");
    console.log(bestMove.move);
    console.log(bestMove.score);

    bestMove = bestMove.move;

    if (bestMove) {
      game.move(bestMove); // Make the best move
      board.position(game.fen()); // Update the board
      updateStatus(); // Update the status
    } else {
      console.log("If youre seeing this that means youre stupid");
    }

    let endTime = performance.now();
    moveTimes.push(endTime - startTime);
    console.log(moveTimes);
    let total = moveTimes.reduce((acc, num) => acc + num, 0);
    let averageTime = total / moveTimes.length;
    let timeDisplay = byId("time");
    timeDisplay.innerHTML =
      "Average Time Per Move: " + averageTime.toFixed(2) / 1000 + " s";
    console.log(averageTime);
  }

  // Evaluation and move picking stuff

  function eval() {
    let whiteScore = 0;
    let blackScore = 0;
    const fen = game.fen().split(" ")[0]; // Get the board state from the FEN string

    for (const char of fen) {
      switch (char) {
        case "P":
          whiteScore += 100;
          break;
        case "N":
          whiteScore += 300;
          break;
        case "B":
          whiteScore += 330;
          break;
        case "R":
          whiteScore += 500;
          break;
        case "Q":
          whiteScore += 900;
          break;
        case "K":
          whiteScore += 9000;
          break;
        case "p":
          blackScore += 100;
          break;
        case "n":
          blackScore += 300;
          break;
        case "b":
          blackScore += 330;
          break;
        case "r":
          blackScore += 500;
          break;
        case "q":
          blackScore += 900;
          break;
        case "k":
          blackScore += 9000;
          break;
        default:
          break; // Ignore other characters (e.g., numbers or slashes)
      }
    }

    var reverseArray = function (array) {
      return array.slice().reverse();
    };

    var pawnEvalWhite = [
      [0, 0, 0, 0, 0, 0, 0, 0],
      [50, 50, 50, 50, 50, 50, 50, 50],
      [10, 10, 20, 30, 30, 20, 10, 10],
      [5, 5, 10, 25, 25, 10, 5, 5],
      [0, 0, 0, 20, 20, 0, 0, 0],
      [5, -5, -10, 0, 0, -10, -5, 5],
      [5, 10, 10, -20, -20, 10, 10, 5],
      [0, 0, 0, 0, 0, 0, 0, 0],
    ];

    var pawnEvalBlack = reverseArray(pawnEvalWhite);

    var knightEval = [
      [-50, -40, -30, -30, -30, -30, -40, -50],
      [-40, -20, 0, 0, 0, 0, -20, -40],
      [-30, 0, 10, 15, 15, 10, 0, -30],
      [-30, 5, 15, 20, 20, 15, 5, -30],
      [-30, 0, 15, 20, 20, 15, 0, -30],
      [-30, 5, 10, 15, 15, 10, 5, -30],
      [-40, -20, 0, 5, 5, 0, -20, -40],
      [-50, -40, -30, -30, -30, -30, -40, -50],
    ];

    var bishopEvalWhite = [
      [-20, -10, -10, -10, -10, -10, -10, -20],
      [-10, 0, 0, 0, 0, 0, 0, -10],
      [-10, 0, 5, 10, 10, 5, 0, -10],
      [-10, 5, 5, 10, 10, 5, 5, -10],
      [-10, 0, 10, 10, 10, 10, 0, -10],
      [-10, 10, 10, 10, 10, 10, 10, -10],
      [-10, 5, 0, 0, 0, 0, 5, -10],
      [-20, -10, -10, -10, -10, -10, -10, -20],
    ];

    var bishopEvalBlack = reverseArray(bishopEvalWhite);

    var rookEvalWhite = [
      [0, 0, 0, 0, 0, 0, 0, 0],
      [5, 10, 10, 10, 10, 10, 10, 5],
      [-5, 0, 0, 0, 0, 0, 0, -5],
      [-5, 0, 0, 0, 0, 0, 0, -5],
      [-5, 0, 0, 0, 0, 0, 0, -5],
      [-5, 0, 0, 0, 0, 0, 0, -5],
      [-5, 0, 0, 0, 0, 0, 0, -5],
      [0, 0, 0, 5, 5, 0, 0, 0],
    ];

    var rookEvalBlack = reverseArray(rookEvalWhite);

    var evalQueen = [
      [-20, -10, -10, -5, -5, -10, -10, -20],
      [-10, 0, 0, 0, 0, 0, 0, -10],
      [-10, 0, 5, 5, 5, 5, 0, -10],
      [-5, 0, 5, 5, 5, 5, 0, -5],
      [0, 0, 5, 5, 5, 5, 0, -5],
      [-10, 5, 5, 5, 5, 5, 0, -10],
      [-10, 0, 5, 0, 0, 0, 0, -10],
      [-20, -10, -10, -5, -5, -10, -10, -20],
    ];

    var kingEvalWhite = [
      [-30, -40, -40, -50, -50, -40, -40, -30],
      [-30, -40, -40, -50, -50, -40, -40, -30],
      [-30, -40, -40, -50, -50, -40, -40, -30],
      [-30, -40, -40, -50, -50, -40, -40, -30],
      [-20, -30, -30, -40, -40, -30, -30, -20],
      [-10, -20, -20, -20, -20, -20, -20, -10],
      [20, 20, 0, 0, 0, 0, 20, 20],
      [20, 30, 10, 0, 0, 10, 30, 20],
    ];

    var kingEvalBlack = reverseArray(kingEvalWhite);

    let boardState = game.board();

    for (let i = 0; i < 8; i++) {
      for (let j = 0; j < 8; j++) {
        let piece = boardState[i][j];

        if (piece) {
          switch (piece.color) {
            case "b":
              switch (piece.type) {
                case "p":
                  blackScore += pawnEvalBlack[i][j];
                  break;
                case "n":
                  blackScore += knightEval[i][j];
                  break;
                case "b":
                  blackScore += bishopEvalBlack[i][j];
                  break;
                case "r":
                  blackScore += rookEvalBlack[i][j];
                  break;
                case "q":
                  blackScore += evalQueen[i][j];
                  break;
                case "k":
                  blackScore += kingEvalBlack[i][j];
                  break;
                default:
                  break;
              }
              break;
            case "w":
              switch (piece.type) {
                case "p":
                  whiteScore += pawnEvalWhite[i][j];
                  break;
                case "n":
                  whiteScore += knightEval[i][j];
                  break;
                case "b":
                  whiteScore += bishopEvalWhite[i][j];
                  break;
                case "r":
                  whiteScore += rookEvalWhite[i][j];
                  break;
                case "q":
                  whiteScore += evalQueen[i][j];
                  break;
                case "k":
                  whiteScore += kingEvalWhite[i][j];
                  break;
                default:
                  break;
              }
              break;
          }
        }
      }
    }

    let score = whiteScore - blackScore;
    return score;
  }
});
