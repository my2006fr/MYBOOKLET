
import React, { useState } from 'react';
import { Book, Page } from '../types';

interface BookDetailProps {
    book: Book;
    onBack: () => void;
    onOpenPage: (id: string) => void;
    onCreatePage: () => void;
    onUpdateBook: (book: Book) => void;
}

const BookDetail: React.FC<BookDetailProps> = ({ 
    book, onBack, onOpenPage, onCreatePage, onUpdateBook 
}) => {
    const [search, setSearch] = useState('');

    const filteredPages = book.pages.filter(p => 
        p.title.toLowerCase().includes(search.toLowerCase()) || 
        p.summary.toLowerCase().includes(search.toLowerCase())
    );

    const toggleBookmark = (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        const updatedBook = {
            ...book,
            pages: book.pages.map(p => p.id === id ? { ...p, isBookmarked: !p.isBookmarked } : p)
        };
        onUpdateBook(updatedBook);
    };

    return (
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <nav className="flex items-center gap-4 mb-8">
                <button 
                    onClick={onBack}
                    className="p-3 rounded-full hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors text-slate-500"
                >
                    <span className="material-symbols-outlined">arrow_back</span>
                </button>
                <h1 className="text-3xl font-black text-slate-900 dark:text-white flex-1 truncate">{book.title}</h1>
            </nav>

            <div className="flex flex-col md:flex-row gap-6 mb-10 items-stretch">
                <div className="relative flex-1">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 material-symbols-outlined text-slate-400">search</span>
                    <input 
                        type="text"
                        placeholder="Search pages in this book..."
                        className="w-full pl-12 pr-4 py-4 rounded-2xl bg-white dark:bg-slate-800 border-none shadow-sm focus:ring-2 focus:ring-primary"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>
                <button 
                    onClick={onCreatePage}
                    className="bg-primary text-white px-8 py-4 rounded-2xl font-bold shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                >
                    <span className="material-symbols-outlined">add</span>
                    New Page
                </button>
            </div>

            <div className="space-y-4">
                {filteredPages.length > 0 ? (
                    filteredPages.map(page => (
                        <div 
                            key={page.id}
                            onClick={() => onOpenPage(page.id)}
                            className="group bg-white dark:bg-slate-800 p-5 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-xl transition-all cursor-pointer flex gap-5 items-start"
                        >
                            <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-700 flex items-center justify-center shrink-0">
                                <span className={`material-symbols-outlined ${page.isBookmarked ? 'text-primary filled' : 'text-slate-400'}`}>
                                    {page.style === 'lined' ? 'notes' : page.style === 'grid' ? 'grid_4x4' : 'article'}
                                </span>
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex justify-between items-start gap-2">
                                    <h3 className="text-lg font-bold text-slate-800 dark:text-white truncate">{page.title}</h3>
                                    <button 
                                        onClick={(e) => toggleBookmark(page.id, e)}
                                        className={`p-1 rounded-lg transition-colors ${page.isBookmarked ? 'text-primary' : 'text-slate-300 hover:text-primary opacity-0 group-hover:opacity-100'}`}
                                    >
                                        <span className="material-symbols-outlined filled">bookmark</span>
                                    </button>
                                </div>
                                <p className="text-slate-500 dark:text-slate-400 text-sm mt-1 line-clamp-2">{page.summary || 'No summary provided.'}</p>
                                <div className="mt-3 flex items-center gap-4 text-xs font-bold text-slate-400 uppercase tracking-widest">
                                    <span>{page.date}</span>
                                    <span className="w-1 h-1 rounded-full bg-slate-300"></span>
                                    <span>{page.style} style</span>
                                </div>
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="text-center py-20 bg-white/50 dark:bg-slate-800/50 rounded-3xl border-2 border-dashed border-slate-200 dark:border-slate-700">
                        <span className="material-symbols-outlined text-6xl text-slate-300 mb-4">folder_open</span>
                        <p className="text-slate-500 font-medium">No pages found.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default BookDetail;
