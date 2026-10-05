import { useState, type CSSProperties } from 'react'
import { Chessboard, type Arrow, type PieceRenderObject } from 'react-chessboard'
import bB from '../assets/pieces/bB.svg'
import bK from '../assets/pieces/bK.svg'
import bN from '../assets/pieces/bN.svg'
import bP from '../assets/pieces/bP.svg'
import bQ from '../assets/pieces/bQ.svg'
import bR from '../assets/pieces/bR.svg'
import wB from '../assets/pieces/wB.svg'
import wK from '../assets/pieces/wK.svg'
import wN from '../assets/pieces/wN.svg'
import wP from '../assets/pieces/wP.svg'
import wQ from '../assets/pieces/wQ.svg'
import wR from '../assets/pieces/wR.svg'
import type { Color } from '../lib/games'

// Pièces « cburnett » (Colin M.L. Burnett, GPLv2+) : licence libre et connue, créditée dans le README.
const PIECE_IMAGES: Record<string, string> = { bB, bK, bN, bP, bQ, bR, wB, wK, wN, wP, wQ, wR }
const PIECES: PieceRenderObject = Object.fromEntries(
  Object.entries(PIECE_IMAGES).map(([key, src]) => [
    key,
    () => <img src={src} alt="" draggable={false} className="size-full select-none" />,
  ]),
)

const SELECTED: CSSProperties = { background: 'rgba(251, 191, 36, 0.55)' }

interface Props {
  fen: string
  orientation: Color
  /** Renvoie true si le coup est accepté (la pièce reste sur la case d'arrivée). */
  onMove?: (from: string, to: string) => boolean
  arrows?: Arrow[]
  highlight?: Record<string, CSSProperties>
  disabled?: boolean
}

export function Board({ fen, orientation, onMove, arrows = [], highlight = {}, disabled }: Props) {
  // Déplacement au clic : première case = pièce choisie, deuxième = destination.
  const [selected, setSelected] = useState<string | null>(null)
  const turn = fen.split(' ')[1] === 'w' ? 'w' : 'b'
  const interactive = Boolean(onMove) && !disabled

  return (
    <div className="aspect-square w-full max-w-[min(100%,28rem)] overflow-hidden rounded-lg">
      <Chessboard
        options={{
          position: fen,
          boardOrientation: orientation,
          pieces: PIECES,
          arrows,
          allowDrawingArrows: false,
          allowDragging: interactive,
          animationDurationInMs: 150,
          darkSquareStyle: { backgroundColor: '#b58863' },
          lightSquareStyle: { backgroundColor: '#f0d9b5' },
          squareStyles: { ...highlight, ...(selected ? { [selected]: SELECTED } : {}) },
          canDragPiece: ({ piece }) => interactive && piece.pieceType.startsWith(turn),
          onPieceDrop: ({ sourceSquare, targetSquare }) => {
            setSelected(null)
            if (!interactive || !targetSquare || !onMove) return false
            return onMove(sourceSquare, targetSquare)
          },
          onSquareClick: ({ piece, square }) => {
            if (!interactive || !onMove) return
            if (piece?.pieceType.startsWith(turn)) {
              setSelected(square === selected ? null : square)
            } else if (selected) {
              onMove(selected, square)
              setSelected(null)
            }
          },
        }}
      />
    </div>
  )
}
