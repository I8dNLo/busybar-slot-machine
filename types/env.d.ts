declare const __BUSY_ADDR__: string;
declare function listen(type: "input", handler: (event: {key: string; action: string; delta?: number}) => void): () => void;
