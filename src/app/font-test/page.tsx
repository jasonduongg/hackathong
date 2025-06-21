"use client";
import { useState } from "react";

// Explicit class usage to ensure Tailwind includes these in the build
const explicitClasses = "text-massive text-massive-sm text-massive-md text-header text-header-sm text-header-md text-subheader text-subheader-sm text-subheader-md text-normal text-tiny";

const fontSizes = [
    { label: "Massive", className: "text-massive" },
    { label: "Massive SM", className: "text-massive-sm" },
    { label: "Massive MD", className: "text-massive-md" },
    { label: "Header", className: "text-header" },
    { label: "Header SM", className: "text-header-sm" },
    { label: "Header MD", className: "text-header-md" },
    { label: "Subheader", className: "text-subheader" },
    { label: "Subheader SM", className: "text-subheader-sm" },
    { label: "Subheader MD", className: "text-subheader-md" },
    { label: "Normal", className: "text-normal" },
    { label: "Tiny", className: "text-tiny" },
];

export default function FontTestPage() {
    const [bold, setBold] = useState(false);
    const [italic, setItalic] = useState(false);

    return (
        <div className="container mx-auto py-8">
            {/* Hidden div to ensure Tailwind includes all classes */}
            <div className={explicitClasses} style={{ display: 'none' }}></div>

            <h1 className="text-header mb-6 font-sans">Font Test Page</h1>
            <div className="mb-4 flex gap-4">
                <label className="flex items-center gap-1">
                    <input type="checkbox" checked={bold} onChange={() => setBold((b) => !b)} /> Bold
                </label>
                <label className="flex items-center gap-1">
                    <input type="checkbox" checked={italic} onChange={() => setItalic((i) => !i)} /> Italic
                </label>
            </div>
            <div className="flex flex-col gap-6 mt-8">
                {fontSizes.map((fs) => (
                    <div key={fs.className} className="flex flex-col gap-1">
                        <span className="text-sm text-muted-foreground">{fs.label} ({fs.className})</span>
                        <p
                            className={`font-sans ${fs.className} ${bold ? "font-bold" : "font-normal"} ${italic ? "italic" : "not-italic"}`}
                        >
                            The quick brown fox jumps over the lazy dog.
                        </p>
                    </div>
                ))}
            </div>
        </div>
    );
} 