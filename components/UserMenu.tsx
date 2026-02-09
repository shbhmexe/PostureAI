"use client";

import React, { useState, useRef, useEffect } from "react";
import { User, signOut } from "firebase/auth";
import { LogOut, User as UserIcon } from "lucide-react";
import { auth } from "@/lib/firebase-client";

type Props = {
    user: User;
};

export default function UserMenu({ user }: Props) {
    const [isOpen, setIsOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const handleSignOut = () => {
        if (auth) {
            void signOut(auth);
        }
    };

    return (
        <div className="relative" ref={menuRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-full border border-slate-200 bg-white ring-offset-white transition-all hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2 dark:border-slate-800 dark:bg-slate-950 dark:ring-offset-slate-950 dark:hover:bg-slate-900 dark:focus:ring-slate-800 cursor-pointer"
            >
                {user.photoURL ? (
                    <img
                        src={user.photoURL}
                        alt={user.displayName || "User"}
                        className="h-full w-full object-cover"
                        referrerPolicy="no-referrer"
                    />
                ) : (
                    <UserIcon className="h-5 w-5 text-slate-500" />
                )}
            </button>

            {isOpen && (
                <div className="absolute right-0 mt-2 w-56 origin-top-right rounded-2xl border border-slate-200 bg-white p-2 shadow-xl ring-1 ring-black ring-opacity-5 focus:outline-none dark:border-slate-800 dark:bg-slate-950 z-50">
                    <div className="flex items-center gap-3 px-3 py-2.5">
                        {user.photoURL ? (
                            <img
                                src={user.photoURL}
                                alt={user.displayName || "User"}
                                className="h-10 w-10 rounded-full object-cover"
                                referrerPolicy="no-referrer"
                            />
                        ) : (
                            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800">
                                <UserIcon className="h-5 w-5 text-slate-500" />
                            </div>
                        )}
                        <div className="flex flex-col truncate text-xs text-slate-500 dark:text-slate-400">
                            <p className="font-semibold text-slate-900 dark:text-slate-100 text-sm truncate">
                                {user.displayName || "User"}
                            </p>
                            <p className="truncate mt-0.5">{user.email}</p>
                        </div>
                    </div>
                    <div className="my-1 h-px bg-slate-100 dark:bg-slate-800" />
                    <button
                        onClick={handleSignOut}
                        className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-rose-600 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-500/10 transition-colors cursor-pointer"
                    >
                        <LogOut className="h-4 w-4" />
                        Sign out
                    </button>
                </div>
            )}
        </div>
    );
}
