// src/react-player.d.ts
declare module 'react-player' {
    import * as React from 'react';

    interface OnProgressProps {
        played: number;
        playedSeconds: number;
        loaded: number;
        loadedSeconds: number;
    }

    interface ReactPlayerProps {
        url: string | string[];
        playing?: boolean;
        loop?: boolean;
        controls?: boolean;
        light?: boolean | string;
        volume?: number | null;
        muted?: boolean;
        width?: string | number;
        height?: string | number;
        style?: React.CSSProperties;
        progressInterval?: number;
        playsinline?: boolean;
        pip?: boolean;
        stopOnUnmount?: boolean;
        fallback?: React.ReactNode;
        wrapper?: any;
        config?: any;
        onReady?: () => void;
        onStart?: () => void;
        onBuffer?: () => void;
        onBufferEnd?: () => void;
        onSeek?: (seconds: number) => void;
        onEnded?: () => void;
        onError?: (error: any) => void;
        onProgress?: (state: OnProgressProps) => void;
        onDuration?: (duration: number) => void;
        onPlaybackRateChange?: (playbackRate: number) => void;
    }

    class ReactPlayer extends React.Component<ReactPlayerProps, any> {
        seekTo(amount: number | string, type?: 'seconds' | 'fraction'): void;
    }

    export default ReactPlayer;
}

declare module 'react-player/youtube' {
    import { ReactPlayerProps } from 'react-player';
    import React from 'react';
    class YouTubePlayer extends React.Component<ReactPlayerProps, any> {}
    export default YouTubePlayer;
}