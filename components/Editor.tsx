
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Page, PageStyle, Highlight, Comment } from '../types';

interface EditorProps {
    page: Page;
    onBack: () => void;
    onSave: (page: Page) => void;
    isDarkMode: boolean;
}

const PRESET_COLORS = ['#000000', '#135bec', '#ef4444', '#22c55e', '#a855f7', '#f59e0b', '#ec4899'];
const HIGHLIGHT_COLORS = ['#fef08a', '#bbf7d0', '#bfdbfe', '#fecaca', '#ddd6fe'];
const FONT_FAMILIES = [
    { name: 'Sans', value: 'Inter, sans-serif' },
    { name: 'Serif', value: 'Playfair Display, serif' },
    { name: 'Handwriting', value: 'Caveat, cursive' },
    { name: 'Mono', value: 'monospace' }
];
const FONT_SIZES = ['12px', '14px', '16px', '18px', '20px', '24px', '32px'];

type ToolType = 'text' | 'fine_liner' | 'pen' | 'marker' | 'highlighter' | 'eraser' | 'shape';
type ShapeType = 'rect' | 'circle' | 'triangle' | 'line';

const Editor: React.FC<EditorProps> = ({ page, onBack, onSave, isDarkMode }) => {
    const [title, setTitle] = useState(page.title);
    const [summary, setSummary] = useState(page.summary);
    const [style, setStyle] = useState<PageStyle>(page.style);
    const [tool, setTool] = useState<ToolType>('text');
    const [selectedShape, setSelectedShape] = useState<ShapeType>('rect');
    const [color, setColor] = useState('#135bec');
    const [recentColors, setRecentColors] = useState<string[]>([]);
    const [isDrawing, setIsDrawing] = useState(false);
    
    const [highlights, setHighlights] = useState<Record<string, Highlight>>(page.highlights || {});
    const [activeHighlightId, setActiveHighlightId] = useState<string | null>(null);
    const [newComment, setNewComment] = useState('');

    const canvasRef = useRef<HTMLCanvasElement>(null);
    const contextRef = useRef<CanvasRenderingContext2D | null>(null);
    const editorRef = useRef<HTMLDivElement>(null);
    
    const [history, setHistory] = useState<string[]>([]);
    const [historyStep, setHistoryStep] = useState(-1);
    
    const startPos = useRef<{ x: number, y: number } | null>(null);
    const snapshot = useRef<ImageData | null>(null);
    const isShiftPressed = useRef(false);

    const restoreCanvasState = useCallback((dataUrl: string) => {
        const ctx = contextRef.current;
        const canvas = canvasRef.current;
        if (ctx && canvas) {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            const img = new Image();
            img.onload = () => {
                ctx.globalCompositeOperation = 'source-over';
                ctx.globalAlpha = 1;
                ctx.drawImage(img, 0, 0);
            };
            img.src = dataUrl;
        }
    }, []);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        
        const updateCanvasSize = () => {
            const rect = canvas.getBoundingClientRect();
            canvas.width = rect.width;
            canvas.height = rect.height;
            if (contextRef.current) {
                contextRef.current.lineCap = 'round';
                contextRef.current.lineJoin = 'round';
            }
        };

        const parent = canvas.parentElement;
        if (parent) {
            canvas.width = parent.clientWidth;
            canvas.height = Math.max(1200, parent.scrollHeight);
        }

        const context = canvas.getContext('2d', { willReadFrequently: true });
        if (context) {
            context.lineCap = 'round';
            context.lineJoin = 'round';
            contextRef.current = context;

            if (page.drawingData) {
                const img = new Image();
                img.onload = () => {
                    context.drawImage(img, 0, 0);
                    setHistory([page.drawingData!]);
                    setHistoryStep(0);
                };
                img.src = page.drawingData;
            }
        }
        
        if (editorRef.current) {
            editorRef.current.innerHTML = page.content || '';
        }

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Shift') isShiftPressed.current = true;
        };
        const handleKeyUp = (e: KeyboardEvent) => {
            if (e.key === 'Shift') isShiftPressed.current = false;
        };
        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('keyup', handleKeyUp);

        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('keyup', handleKeyUp);
        };
    }, []);

    const execCommand = (command: string, value: string = '') => {
        if (editorRef.current) {
            editorRef.current.focus();
        }
        document.execCommand(command, false, value);
    };

    const handleHighlight = (hColor: string) => {
        const selection = window.getSelection();
        if (!selection || selection.rangeCount === 0 || selection.isCollapsed) return;

        const range = selection.getRangeAt(0);
        const id = 'hl_' + Date.now();
        
        const span = document.createElement('span');
        span.style.backgroundColor = hColor;
        span.className = 'highlight-node cursor-pointer border-b-2 border-transparent hover:border-black/20 transition-all';
        span.setAttribute('data-highlight-id', id);
        
        try {
            range.surroundContents(span);
            setHighlights(prev => ({
                ...prev,
                [id]: { id, color: hColor, comments: [] }
            }));
            setActiveHighlightId(id);
        } catch (e) {
            console.warn('Highlight failed: Selection spans multiple blocks', e);
        }
        
        selection.removeAllRanges();
    };

    const handleEditorClick = (e: React.MouseEvent) => {
        const target = e.target as HTMLElement;
        const hlId = target.getAttribute('data-highlight-id');
        if (hlId) {
            setActiveHighlightId(hlId);
        } else {
            setActiveHighlightId(null);
        }
    };

    const addComment = () => {
        if (!activeHighlightId || !newComment.trim()) return;
        
        const comment: Comment = {
            id: 'c_' + Date.now(),
            text: newComment,
            author: 'Me',
            createdAt: Date.now()
        };

        setHighlights(prev => ({
            ...prev,
            [activeHighlightId]: {
                ...prev[activeHighlightId],
                comments: [...prev[activeHighlightId].comments, comment]
            }
        }));
        setNewComment('');
    };

    const saveCanvasToHistory = () => {
        const data = canvasRef.current?.toDataURL();
        if (data) {
            setHistory(prev => {
                const newHistory = prev.slice(0, historyStep + 1);
                return [...newHistory, data];
            });
            setHistoryStep(prev => prev + 1);
        }
    };

    const handleUndo = () => {
        if (tool === 'text') {
            execCommand('undo');
        } else {
            if (historyStep > 0) {
                const newStep = historyStep - 1;
                setHistoryStep(newStep);
                restoreCanvasState(history[newStep]);
            } else if (historyStep === 0) {
                setHistoryStep(-1);
                const ctx = contextRef.current;
                const canvas = canvasRef.current;
                if (ctx && canvas) {
                    ctx.clearRect(0, 0, canvas.width, canvas.height);
                }
            }
        }
    };

    const handleRedo = () => {
        if (tool === 'text') {
            execCommand('redo');
        } else {
            if (historyStep < history.length - 1) {
                const newStep = historyStep + 1;
                setHistoryStep(newStep);
                restoreCanvasState(history[newStep]);
            }
        }
    };

    const handleSetColor = (newColor: string) => {
        setColor(newColor);
        if (!PRESET_COLORS.includes(newColor)) {
            setRecentColors(prev => {
                const filtered = prev.filter(c => c !== newColor);
                return [newColor, ...filtered].slice(0, 5);
            });
        }
    };

    const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
        if (tool === 'text') return;
        setIsDrawing(true);
        const { offsetX, offsetY } = getCoordinates(e);
        
        startPos.current = { x: offsetX, y: offsetY };
        if (contextRef.current && canvasRef.current) {
            snapshot.current = contextRef.current.getImageData(0, 0, canvasRef.current.width, canvasRef.current.height);
            if (tool !== 'shape' || selectedShape === 'line') {
                contextRef.current.beginPath();
                contextRef.current.moveTo(offsetX, offsetY);
            }
        }
    };

    const draw = (e: React.MouseEvent | React.TouchEvent) => {
        if (!isDrawing || !contextRef.current || !startPos.current || tool === 'text') return;
        const { offsetX, offsetY } = getCoordinates(e);
        const ctx = contextRef.current;
        
        ctx.strokeStyle = tool === 'eraser' ? (isDarkMode ? '#1c222e' : 'white') : color;
        ctx.fillStyle = color;

        if (tool === 'shape' || (tool !== 'eraser' && isShiftPressed.current)) {
            if (snapshot.current) ctx.putImageData(snapshot.current, 0, 0);
            ctx.globalAlpha = 1;
            ctx.globalCompositeOperation = 'source-over';
            
            if (tool === 'shape') {
                ctx.lineWidth = 2;
            } else {
                switch(tool) {
                    case 'fine_liner': ctx.lineWidth = 1; break;
                    case 'pen': ctx.lineWidth = 3; break;
                    case 'marker': ctx.lineWidth = 8; break;
                    case 'highlighter': ctx.globalAlpha = 0.35; ctx.lineWidth = 24; ctx.globalCompositeOperation = 'multiply'; break;
                    default: ctx.lineWidth = 2;
                }
            }

            const startX = startPos.current.x;
            const startY = startPos.current.y;
            const width = offsetX - startX;
            const height = offsetY - startY;

            ctx.beginPath();
            if (tool === 'shape') {
                if (selectedShape === 'rect') {
                    ctx.rect(startX, startY, width, height);
                } else if (selectedShape === 'circle') {
                    const radius = Math.sqrt(width * width + height * height);
                    ctx.arc(startX, startY, radius, 0, 2 * Math.PI);
                } else if (selectedShape === 'triangle') {
                    ctx.moveTo(startX + width / 2, startY);
                    ctx.lineTo(startX, startY + height);
                    ctx.lineTo(startX + width, startY + height);
                    ctx.closePath();
                } else if (selectedShape === 'line') {
                    ctx.moveTo(startX, startY);
                    ctx.lineTo(offsetX, offsetY);
                }
            } else {
                ctx.moveTo(startX, startY);
                ctx.lineTo(offsetX, offsetY);
            }
            ctx.stroke();
            return;
        }

        ctx.globalAlpha = 1;
        ctx.globalCompositeOperation = 'source-over';
        switch(tool) {
            case 'fine_liner': ctx.lineWidth = 1; break;
            case 'pen': ctx.lineWidth = 3; break;
            case 'marker': ctx.lineWidth = 8; break;
            case 'highlighter': ctx.globalAlpha = 0.35; ctx.lineWidth = 24; ctx.globalCompositeOperation = 'multiply'; break;
            case 'eraser': ctx.lineWidth = 40; ctx.globalCompositeOperation = 'destination-out'; break;
            default: ctx.lineWidth = 2;
        }

        ctx.lineTo(offsetX, offsetY);
        ctx.stroke();
    };

    const stopDrawing = () => {
        if (isDrawing) {
            contextRef.current?.closePath();
            setIsDrawing(false);
            startPos.current = null;
            snapshot.current = null;
            saveCanvasToHistory();
        }
    };

    // Fix: Updated coordinate extraction to use a type-safe check for 'touches' to differentiate between 
    // MouseEvent and TouchEvent, resolving property access errors on union types.
    const getCoordinates = (e: React.MouseEvent | React.TouchEvent) => {
        const canvas = canvasRef.current;
        if (!canvas) return { offsetX: 0, offsetY: 0 };
        const rect = canvas.getBoundingClientRect();
        
        let clientX: number;
        let clientY: number;

        if ('touches' in e) {
            // Handle touch events
            const touch = (e as React.TouchEvent).touches[0];
            clientX = touch.clientX;
            clientY = touch.clientY;
        } else {
            // Handle mouse events
            const mouseEvent = e as React.MouseEvent;
            clientX = mouseEvent.clientX;
            clientY = mouseEvent.clientY;
        }

        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;

        return {
            offsetX: (clientX - rect.left) * scaleX,
            offsetY: (clientY - rect.top) * scaleY
        };
    };

    const handleSave = () => {
        onSave({
            ...page,
            title,
            summary,
            content: editorRef.current?.innerHTML || '',
            style,
            drawingData: canvasRef.current?.toDataURL(),
            highlights
        });
        onBack();
    };

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
                const img = new Image();
                img.onload = () => {
                    const ctx = contextRef.current;
                    if (ctx) {
                        ctx.globalCompositeOperation = 'source-over';
                        ctx.globalAlpha = 1;
                        ctx.drawImage(img, 50, 50, 200, 200);
                        saveCanvasToHistory();
                    }
                };
                img.src = event.target?.result as string;
            };
            reader.readAsDataURL(file);
        }
    };

    return (
        <div className="flex flex-col h-screen overflow-hidden bg-slate-100 dark:bg-slate-950">
            <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-4 py-2 flex items-center justify-between z-30 shadow-sm shrink-0">
                <div className="flex items-center gap-3">
                    <button onClick={onBack} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors">
                        <span className="material-symbols-outlined">arrow_back</span>
                    </button>
                    <div className="w-px h-6 bg-slate-200 dark:bg-slate-700 mx-1"></div>
                    <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
                        <button 
                            onClick={() => setTool('text')}
                            className={`px-3 py-1.5 rounded-lg flex items-center gap-2 transition-all ${tool === 'text' ? 'bg-white dark:bg-slate-700 shadow-sm text-primary font-bold' : 'text-slate-500'}`}
                        >
                            <span className="material-symbols-outlined text-sm">text_fields</span>
                            <span className="text-xs">Type</span>
                        </button>
                        <button 
                            onClick={() => setTool('pen')}
                            className={`px-3 py-1.5 rounded-lg flex items-center gap-2 transition-all ${tool !== 'text' ? 'bg-white dark:bg-slate-700 shadow-sm text-primary font-bold' : 'text-slate-500'}`}
                        >
                            <span className="material-symbols-outlined text-sm">draw</span>
                            <span className="text-xs">Draw</span>
                        </button>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <button 
                        onClick={handleUndo} 
                        className={`p-2 transition-colors rounded-xl ${
                            (tool !== 'text' && historyStep <= -1) 
                            ? 'text-slate-300 dark:text-slate-700 cursor-not-allowed' 
                            : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
                        }`} 
                        disabled={tool !== 'text' && historyStep <= -1}
                        title="Undo"
                    >
                        <span className="material-symbols-outlined">undo</span>
                    </button>
                    <button 
                        onClick={handleRedo} 
                        className={`p-2 transition-colors rounded-xl ${
                            (tool !== 'text' && historyStep >= history.length - 1)
                            ? 'text-slate-300 dark:text-slate-700 cursor-not-allowed' 
                            : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
                        }`} 
                        disabled={tool !== 'text' && historyStep >= history.length - 1}
                        title="Redo"
                    >
                        <span className="material-symbols-outlined">redo</span>
                    </button>
                    <div className="w-px h-6 bg-slate-200 dark:bg-slate-700 mx-2"></div>
                    <button 
                        onClick={handleSave}
                        className="bg-primary text-white px-6 py-2 rounded-xl font-bold hover:shadow-lg transition-all"
                    >
                        Save Note
                    </button>
                </div>
            </header>

            <div className="flex flex-1 overflow-hidden relative">
                <main className="flex-1 overflow-y-auto p-4 md:p-10 flex justify-center scroll-smooth">
                    <div 
                        className={`relative w-full max-w-4xl min-h-[1200px] bg-white dark:bg-paper-dark shadow-2xl rounded-sm transition-all duration-300 ${
                            style === 'lined' ? 'lined-pattern' : style === 'grid' ? 'grid-pattern' : ''
                        }`}
                        style={{ '--paper-line-color': isDarkMode ? 'rgba(19, 91, 236, 0.05)' : 'rgba(19, 91, 236, 0.1)' } as any}
                    >
                        <div className="absolute left-16 top-0 bottom-0 w-0.5 bg-paper-margin/40 pointer-events-none"></div>

                        <div className="relative z-10 p-10 pl-24 space-y-8 h-full flex flex-col">
                            <div className="flex justify-between items-start">
                                <input 
                                    type="text"
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                    className="text-4xl font-black bg-transparent border-none focus:ring-0 p-0 w-full text-slate-900 dark:text-white placeholder:text-slate-200"
                                    placeholder="Page Title"
                                />
                                <div className="text-right">
                                    <span className="text-sm font-bold text-slate-400 uppercase tracking-widest">{page.date}</span>
                                </div>
                            </div>

                            <div className="bg-slate-50 dark:bg-slate-800/50 p-6 rounded-2xl border border-slate-100 dark:border-slate-800">
                                <h4 className="text-xs font-black uppercase tracking-widest text-primary mb-2">Executive Summary</h4>
                                <textarea 
                                    value={summary}
                                    onChange={(e) => setSummary(e.target.value)}
                                    rows={2}
                                    className="w-full bg-transparent border-none focus:ring-0 p-0 text-slate-600 dark:text-slate-300 resize-none font-medium leading-relaxed"
                                    placeholder="Briefly what is this page about?"
                                />
                            </div>

                            <div className="flex-1 min-h-[600px] relative">
                                <div 
                                    ref={editorRef}
                                    contentEditable={tool === 'text'}
                                    onClick={handleEditorClick}
                                    className={`w-full h-full bg-transparent border-none focus:outline-none p-0 text-slate-800 dark:text-slate-100 font-sans text-lg leading-[2rem] outline-none ${tool === 'text' ? 'z-30 cursor-text' : 'z-10'}`}
                                    style={{ lineHeight: '2rem', minHeight: '600px' }}
                                    data-placeholder="Start typing your notes..."
                                />
                                
                                <div className={`absolute inset-0 ${tool === 'text' ? 'z-10 pointer-events-none' : 'z-20 cursor-crosshair'}`}>
                                    <canvas 
                                        ref={canvasRef}
                                        onMouseDown={startDrawing}
                                        onMouseMove={draw}
                                        onMouseUp={stopDrawing}
                                        onMouseOut={stopDrawing}
                                        onTouchStart={startDrawing}
                                        onTouchMove={draw}
                                        onTouchEnd={stopDrawing}
                                        className="w-full h-full block"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                </main>

                <div className={`w-80 border-l border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 transition-all duration-300 flex flex-col ${activeHighlightId ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0 absolute right-0 bottom-0 top-0 overflow-hidden'}`}>
                    <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-800/50">
                        <h3 className="font-bold flex items-center gap-2 text-slate-700 dark:text-slate-200">
                            <span className="material-symbols-outlined text-primary text-xl">comment</span>
                            Comments
                        </h3>
                        <button onClick={() => setActiveHighlightId(null)} className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors">
                            <span className="material-symbols-outlined">close</span>
                        </button>
                    </div>
                    
                    <div className="flex-1 overflow-y-auto p-4 space-y-4">
                        {activeHighlightId && highlights[activeHighlightId]?.comments.length > 0 ? (
                            highlights[activeHighlightId].comments.map(c => (
                                <div key={c.id} className="bg-slate-50 dark:bg-slate-800 p-3 rounded-xl border border-slate-200 dark:border-slate-700">
                                    <div className="flex justify-between items-center mb-1">
                                        <span className="text-xs font-black text-primary uppercase tracking-tighter">{c.author}</span>
                                        <span className="text-[10px] text-slate-400">{new Date(c.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                    </div>
                                    <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">{c.text}</p>
                                </div>
                            ))
                        ) : (
                            <div className="h-full flex flex-col items-center justify-center text-slate-400 text-center px-4">
                                <span className="material-symbols-outlined text-4xl mb-2">chat_bubble</span>
                                <p className="text-sm font-medium">No comments yet. Start the conversation!</p>
                            </div>
                        )}
                    </div>

                    <div className="p-4 border-t border-slate-200 dark:border-slate-800">
                        <textarea 
                            value={newComment}
                            onChange={(e) => setNewComment(e.target.value)}
                            placeholder="Type a comment..."
                            className="w-full bg-slate-100 dark:bg-slate-800 border-none rounded-xl p-3 text-sm focus:ring-1 focus:ring-primary resize-none mb-2"
                            rows={3}
                        />
                        <button 
                            disabled={!newComment.trim()}
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={addComment}
                            className="w-full bg-primary text-white py-2 rounded-xl font-bold text-sm shadow-md shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:scale-100"
                        >
                            Post Comment
                        </button>
                    </div>
                </div>
            </div>

            <footer className="bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 p-3 flex items-center justify-center gap-6 z-30 shrink-0 shadow-lg">
                <div className="flex items-center gap-1">
                    <button 
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => setStyle('plain')}
                        className={`p-2 rounded-xl transition-all ${style === 'plain' ? 'bg-primary text-white' : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400'}`}
                        title="Plain Paper"
                    >
                        <span className="material-symbols-outlined">article</span>
                    </button>
                    <button 
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => setStyle('lined')}
                        className={`p-2 rounded-xl transition-all ${style === 'lined' ? 'bg-primary text-white' : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400'}`}
                        title="Lined Paper"
                    >
                        <span className="material-symbols-outlined">notes</span>
                    </button>
                    <button 
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => setStyle('grid')}
                        className={`p-2 rounded-xl transition-all ${style === 'grid' ? 'bg-primary text-white' : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400'}`}
                        title="Grid Paper"
                    >
                        <span className="material-symbols-outlined">grid_4x4</span>
                    </button>
                </div>

                <div className="w-px h-8 bg-slate-200 dark:bg-slate-700"></div>

                {tool === 'text' ? (
                    <div className="flex items-center gap-1">
                        <select 
                            onChange={(e) => execCommand('fontName', e.target.value)}
                            className="bg-slate-100 dark:bg-slate-800 border-none rounded-xl text-xs font-bold py-1 px-3 focus:ring-primary"
                        >
                            {FONT_FAMILIES.map(f => (
                                <option key={f.value} value={f.value}>{f.name}</option>
                            ))}
                        </select>

                        <select 
                            onChange={(e) => execCommand('fontSize', e.target.value)}
                            className="bg-slate-100 dark:bg-slate-800 border-none rounded-xl text-xs font-bold py-1 px-3 focus:ring-primary"
                        >
                            {FONT_SIZES.map((s, i) => (
                                <option key={s} value={i+1}>{s}</option>
                            ))}
                        </select>

                        <div className="w-px h-6 bg-slate-200 dark:bg-slate-700 mx-1"></div>

                        <button onMouseDown={(e) => e.preventDefault()} onClick={() => execCommand('bold')} className="w-9 h-9 flex items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl text-slate-700 dark:text-slate-300 font-bold" title="Bold">B</button>
                        <button onMouseDown={(e) => e.preventDefault()} onClick={() => execCommand('italic')} className="w-9 h-9 flex items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl text-slate-700 dark:text-slate-300 italic" title="Italic">I</button>
                        <button onMouseDown={(e) => e.preventDefault()} onClick={() => execCommand('underline')} className="w-9 h-9 flex items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl text-slate-700 dark:text-slate-300 underline" title="Underline">U</button>
                        
                        <div className="w-px h-6 bg-slate-200 dark:bg-slate-700 mx-1"></div>
                        
                        <div className="flex items-center gap-1 bg-slate-50 dark:bg-slate-800 p-1 rounded-xl mx-1">
                            {HIGHLIGHT_COLORS.map(hc => (
                                <button 
                                    key={hc}
                                    onMouseDown={(e) => e.preventDefault()}
                                    onClick={() => handleHighlight(hc)}
                                    className="w-6 h-6 rounded-md border border-black/5 hover:scale-110 transition-transform"
                                    style={{ backgroundColor: hc }}
                                />
                            ))}
                        </div>

                        <div className="w-px h-6 bg-slate-200 dark:bg-slate-700 mx-1"></div>
                        
                        <button onMouseDown={(e) => e.preventDefault()} onClick={() => execCommand('insertUnorderedList')} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl text-slate-500" title="Bulleted List">
                            <span className="material-symbols-outlined">format_list_bulleted</span>
                        </button>
                        <button onMouseDown={(e) => e.preventDefault()} onClick={() => execCommand('insertOrderedList')} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl text-slate-500" title="Numbered List">
                            <span className="material-symbols-outlined">format_list_numbered</span>
                        </button>
                        <button onMouseDown={(e) => e.preventDefault()} onClick={() => execCommand('justifyLeft')} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl text-slate-500" title="Align Left">
                            <span className="material-symbols-outlined">format_align_left</span>
                        </button>
                        <button onMouseDown={(e) => e.preventDefault()} onClick={() => execCommand('justifyCenter')} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl text-slate-500" title="Align Center">
                            <span className="material-symbols-outlined">format_align_center</span>
                        </button>
                    </div>
                ) : (
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                            <div className="flex gap-1">
                                {PRESET_COLORS.map(c => (
                                    <button 
                                        key={c}
                                        onClick={() => handleSetColor(c)}
                                        className={`w-7 h-7 rounded-full border-2 transition-transform ${color === c ? 'scale-125 border-slate-400' : 'border-transparent'}`}
                                        style={{ backgroundColor: c }}
                                    />
                                ))}
                            </div>
                            <label className="relative flex items-center justify-center w-8 h-8 rounded-full border-2 border-dashed border-slate-300 dark:border-slate-600 hover:border-primary hover:bg-slate-50 dark:hover:bg-slate-800 transition-all cursor-pointer overflow-hidden ml-1">
                                <span className="material-symbols-outlined text-sm text-slate-400">palette</span>
                                <input type="color" className="absolute inset-0 opacity-0 cursor-pointer" value={color} onChange={(e) => handleSetColor(e.target.value)} />
                            </label>
                        </div>

                        <div className="w-px h-6 bg-slate-200 dark:bg-slate-700 mx-1"></div>
                        
                        <div className="flex items-center gap-1 bg-slate-50 dark:bg-slate-800 p-1 rounded-xl">
                            <button onClick={() => setTool('fine_liner')} className={`p-2 rounded-lg transition-all ${tool === 'fine_liner' ? 'bg-white dark:bg-slate-700 shadow-sm text-primary' : 'text-slate-400'}`} title="Fine Liner">
                                <span className="material-symbols-outlined text-lg">edit</span>
                            </button>
                            <button onClick={() => setTool('pen')} className={`p-2 rounded-lg transition-all ${tool === 'pen' ? 'bg-white dark:bg-slate-700 shadow-sm text-primary' : 'text-slate-400'}`} title="Standard Pen">
                                <span className="material-symbols-outlined text-lg">brush</span>
                            </button>
                            <button onClick={() => setTool('marker')} className={`p-2 rounded-lg transition-all ${tool === 'marker' ? 'bg-white dark:bg-slate-700 shadow-sm text-primary' : 'text-slate-400'}`} title="Marker">
                                <span className="material-symbols-outlined text-lg">ink_pen</span>
                            </button>
                            <button onClick={() => setTool('highlighter')} className={`p-2 rounded-lg transition-all ${tool === 'highlighter' ? 'bg-white dark:bg-slate-700 shadow-sm text-primary' : 'text-slate-400'}`} title="Highlighter">
                                <span className="material-symbols-outlined text-lg">ink_highlighter</span>
                            </button>
                        </div>

                        <div className="w-px h-6 bg-slate-200 dark:bg-slate-700 mx-1"></div>

                        <div className="flex items-center gap-1">
                            <button onClick={() => setTool('eraser')} className={`p-2 rounded-xl transition-all ${tool === 'eraser' ? 'bg-slate-800 dark:bg-slate-200 text-white dark:text-slate-900' : 'text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'}`} title="Eraser">
                                <span className="material-symbols-outlined">ink_eraser</span>
                            </button>
                            <button onClick={() => setTool('shape')} className={`p-2 rounded-xl transition-all ${tool === 'shape' ? 'bg-primary/10 text-primary' : 'text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'}`} title="Shapes">
                                <span className="material-symbols-outlined">shapes</span>
                            </button>
                        </div>
                        
                        {tool === 'shape' && (
                            <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl gap-1">
                                <button onClick={() => setSelectedShape('rect')} className={`p-1.5 rounded-lg transition-all ${selectedShape === 'rect' ? 'bg-white dark:bg-slate-700 shadow-sm text-primary' : 'text-slate-400'}`} title="Rectangle">
                                    <span className="material-symbols-outlined text-sm">rectangle</span>
                                </button>
                                <button onClick={() => setSelectedShape('circle')} className={`p-1.5 rounded-lg transition-all ${selectedShape === 'circle' ? 'bg-white dark:bg-slate-700 shadow-sm text-primary' : 'text-slate-400'}`} title="Circle">
                                    <span className="material-symbols-outlined text-sm">circle</span>
                                </button>
                                <button onClick={() => setSelectedShape('triangle')} className={`p-1.5 rounded-lg transition-all ${selectedShape === 'triangle' ? 'bg-white dark:bg-slate-700 shadow-sm text-primary' : 'text-slate-400'}`} title="Triangle">
                                    <span className="material-symbols-outlined text-sm">change_history</span>
                                </button>
                                <button onClick={() => setSelectedShape('line')} className={`p-1.5 rounded-lg transition-all ${selectedShape === 'line' ? 'bg-white dark:bg-slate-700 shadow-sm text-primary' : 'text-slate-400'}`} title="Line">
                                    <span className="material-symbols-outlined text-sm">horizontal_rule</span>
                                </button>
                            </div>
                        )}
                    </div>
                )}

                <div className="w-px h-8 bg-slate-200 dark:bg-slate-700"></div>

                <div className="flex gap-2">
                    <label className="cursor-pointer bg-slate-100 dark:bg-slate-800 p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-200 transition-colors" title="Insert Image">
                        <span className="material-symbols-outlined">image</span>
                        <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} />
                    </label>
                </div>
            </footer>
        </div>
    );
};

export default Editor;
