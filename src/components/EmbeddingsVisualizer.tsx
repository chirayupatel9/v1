import React, { useEffect, useRef, useState } from 'react';
import * as PIXI from 'pixi.js';
import { Lasso, Move, ZoomIn, Hand, MinusCircle, PlusCircle, Loader2 } from 'lucide-react';
import { Point } from '../types/embedding';
import { useEmbeddingsData } from '../hooks/useEmbeddingsData';
import { useImagePreloader } from '../hooks/useImagePreloader';
import { PixiRenderer } from './PixiRenderer';
import { SelectionOverlay } from './SelectionOverlay';

const CHUNK_SIZE = 100000;
const MIN_ZOOM = 0.1;
const MAX_ZOOM = 5;

export const EmbeddingsVisualizer: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const { points, isLoading, error } = useEmbeddingsData();
  const [selectedPoints, setSelectedPoints] = useState<Point[]>([]);
  const [isLassoMode, setIsLassoMode] = useState(false);
  const [isPanMode, setIsPanMode] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [viewportBounds, setViewportBounds] = useState({ width: 0, height: 0 });
  const { preloadImages, getLoadedImage } = useImagePreloader();

  useEffect(() => {
    if (!containerRef.current) return;
    
    const updateViewportSize = () => {
      if (containerRef.current) {
        setViewportBounds({
          width: containerRef.current.clientWidth,
          height: containerRef.current.clientHeight
        });
      }
    };

    updateViewportSize();
    window.addEventListener('resize', updateViewportSize);
    
    const preloadChunks = async () => {
      const uniqueSpritePaths = [...new Set(points.map(p => p.spritePath))];
      for (let i = 0; i < uniqueSpritePaths.length; i += CHUNK_SIZE) {
        const chunk = uniqueSpritePaths.slice(i, i + CHUNK_SIZE);
        await preloadImages(chunk);
      }
    };

    preloadChunks();

    return () => window.removeEventListener('resize', updateViewportSize);
  }, [points, preloadImages]);

  const handleZoomChange = (newZoom: number) => {
    setZoomLevel(Math.min(Math.max(newZoom, MIN_ZOOM), MAX_ZOOM));
  };

  const handleModeChange = (mode: 'pan' | 'lasso' | null) => {
    setIsLassoMode(mode === 'lasso');
    setIsPanMode(mode === 'pan');
  };

  if (error) {
    return (
      <div className="flex items-center justify-center h-96 bg-red-50 rounded-lg">
        <p className="text-red-600">Error loading embeddings: {error}</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96 bg-gray-50 rounded-lg">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center w-full max-w-4xl mx-auto">
      <div className="w-full bg-white rounded-lg shadow-lg p-4 mb-4">
        <div className="flex justify-between items-center mb-4">
          <div className="flex gap-2">
            <button
              onClick={() => handleModeChange(isLassoMode ? null : 'lasso')}
              className={`flex items-center gap-2 px-4 py-2 rounded-md transition-colors ${
                isLassoMode
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              <Lasso size={20} />
              {isLassoMode ? 'Exit Lasso' : 'Lasso Select'}
            </button>
            <button
              onClick={() => handleModeChange(isPanMode ? null : 'pan')}
              className={`flex items-center gap-2 px-4 py-2 rounded-md transition-colors ${
                isPanMode
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              <Hand size={20} />
              {isPanMode ? 'Exit Pan' : 'Pan Mode'}
            </button>
            <button
              onClick={() => setSelectedPoints([])}
              className="flex items-center gap-2 px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition-colors"
            >
              <Move size={20} />
              Reset View
            </button>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleZoomChange(zoomLevel - 0.1)}
                className="p-1 text-gray-600 hover:text-gray-900 transition-colors"
                disabled={zoomLevel <= MIN_ZOOM}
              >
                <MinusCircle size={20} />
              </button>
              <input
                type="range"
                min={MIN_ZOOM}
                max={MAX_ZOOM}
                step="0.1"
                value={zoomLevel}
                onChange={(e) => handleZoomChange(parseFloat(e.target.value))}
                className="w-32"
              />
              <button
                onClick={() => handleZoomChange(zoomLevel + 0.1)}
                className="p-1 text-gray-600 hover:text-gray-900 transition-colors"
                disabled={zoomLevel >= MAX_ZOOM}
              >
                <PlusCircle size={20} />
              </button>
              <span className="text-sm text-gray-600 min-w-[4rem]">
                {Math.round(zoomLevel * 100)}%
              </span>
            </div>
            <div className="text-sm text-gray-600">
              Selected: {selectedPoints.length}
            </div>
          </div>
        </div>
        
        <div 
          ref={containerRef} 
          className="relative w-full h-[600px] border border-gray-200 rounded-lg overflow-hidden"
          style={{ backgroundColor: '#f8fafc' }}
        >
          <PixiRenderer
            points={points}
            selectedPoints={selectedPoints}
            setSelectedPoints={setSelectedPoints}
            viewportBounds={viewportBounds}
            isLassoMode={isLassoMode}
            isPanMode={isPanMode}
            zoomLevel={zoomLevel}
            getLoadedImage={getLoadedImage}
          />
          {isLassoMode && (
            <SelectionOverlay
              points={points}
              onSelection={setSelectedPoints}
              viewportBounds={viewportBounds}
            />
          )}
        </div>

        {selectedPoints.length > 0 && (
          <div className="mt-4 p-4 bg-gray-50 rounded-lg">
            <h3 className="text-lg font-semibold mb-2">Selected Categories:</h3>
            <div className="flex flex-wrap gap-2">
              {Array.from(new Set(selectedPoints.map(p => p.category))).map(category => (
                <span
                  key={category}
                  className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm"
                >
                  {category}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};