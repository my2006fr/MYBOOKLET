
import React, { useState } from 'react';
import { Book } from '../types';

interface DashboardProps {
    books: Book[];
    onCreateBook: (title: string) => void;
    onToggleStar: (id: string) => void;
    onOpenBook: (id: string) => void;
    onToggleDarkMode: () => void;
    isDarkMode: boolean;
}

const Dashboard: React.FC<DashboardProps> = ({ 
    books, onCreateBook, onToggleStar, onOpenBook, onToggleDarkMode, isDarkMode 
}) => {
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [newBookTitle, setNewBookTitle] = useState('');

    const handleCreate = () => {
        if (newBookTitle.trim()) {
            onCreateBook(newBookTitle);
            setNewBookTitle('');
            setShowCreateModal(false);
        }
    };

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <header className="flex justify-between items-center mb-10">
                <div>
                    <h1 className="text-4xl font-black tracking-tight text-slate-900 dark:text-white flex items-center gap-3">
                        <span className="material-symbols-outlined text-primary text-4xl filled">menu_book</span>
                        MYBOOKLET
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-1">Organize your thoughts, one book at a time.</p>
                </div>
                <div className="flex gap-4">
                    <button 
                        onClick={onToggleDarkMode}
                        className="p-3 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md transition-all"
                    >
                        <span className="material-symbols-outlined">
                            {isDarkMode ? 'light_mode' : 'dark_mode'}
                        </span>
                    </button>
                    <button 
                        onClick={() => setShowCreateModal(true)}
                        className="bg-primary text-white px-6 py-3 rounded-2xl font-bold shadow-lg shadow-primary/25 hover:scale-105 active:scale-95 transition-all flex items-center gap-2"
                    >
                        <span className="material-symbols-outlined">add</span>
                        New Book
                    </button>
                </div>
            </header>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
                {books.map((book) => (
                    <div 
                        key={book.id}
                        onClick={() => onOpenBook(book.id)}
                        className="group relative bg-white dark:bg-slate-800 rounded-3xl overflow-hidden border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-2xl hover:-translate-y-2 transition-all duration-300 cursor-pointer"
                    >
                        <div className={`h-40 ${book.coverColor} relative flex items-center justify-center`}>
                            <span className="material-symbols-outlined text-white/40 text-7xl select-none group-hover:scale-110 transition-transform duration-500">auto_stories</span>
                            <button 
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onToggleStar(book.id);
                                }}
                                className="absolute top-4 right-4 p-2 rounded-full bg-white/20 backdrop-blur-md text-white hover:bg-white/40 transition-colors"
                            >
                                <span className={`material-symbols-outlined ${book.isStarred ? 'filled text-yellow-400' : ''}`}>
                                    star
                                </span>
                            </button>
                        </div>
                        <div className="p-6">
                            <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100 truncate">{book.title}</h3>
                            <div className="mt-4 flex items-center justify-between text-slate-400 text-sm font-medium">
                                <span className="flex items-center gap-1">
                                    <span className="material-symbols-outlined text-sm">description</span>
                                    {book.pages.length} Pages
                                </span>
                                <span>{new Date(book.updatedAt).toLocaleDateString()}</span>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {showCreateModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
                    <div className="bg-white dark:bg-slate-800 rounded-3xl w-full max-w-md p-8 shadow-2xl animate-in zoom-in duration-200">
                        <h2 className="text-2xl font-black mb-6 text-slate-900 dark:text-white">Create New Notebook</h2>
                        <input 
                            autoFocus
                            type="text"
                            placeholder="My Physics Notes..."
                            className="w-full bg-slate-100 dark:bg-slate-700 border-none rounded-2xl p-4 text-lg font-medium focus:ring-2 focus:ring-primary mb-8"
                            value={newBookTitle}
                            onChange={(e) => setNewBookTitle(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
                        />
                        <div className="flex gap-4">
                            <button 
                                onClick={() => setShowCreateModal(false)}
                                className="flex-1 px-6 py-3 rounded-2xl font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                            >
                                Cancel
                            </button>
                            <button 
                                onClick={handleCreate}
                                className="flex-1 bg-primary text-white px-6 py-3 rounded-2xl font-bold shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all"
                            >
                                Create
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Dashboard;
