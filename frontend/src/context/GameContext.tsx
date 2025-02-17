
// // NOTE : This is no longer used in the frontend ,this was the part of earlier version


// import {  createContext, useContext } from "react"

// interface IGameContext {
//     socket: WebSocket,
//     init_game: (message: any) => void

// }

// export const GameContext = createContext<IGameContext | null>(null)


// export const useGameContext = () => {
//     const context = useContext(GameContext)
//     if (!context) {
//         throw new Error("useGameContext must be used within a GameContextProvider")
//     }
//     return context
// }