import React from 'react';
import ReactMarkdown from 'react-markdown';
import { cn } from "@/lib/utils";

export default function MessageBubble({ message }) {
  const isUser = message.role === 'user';
  
  return (
    <div className={cn("flex gap-3", isUser ? "justify-end" : "justify-start")}>
      {!isUser && (
        <div className="h-7 w-7 rounded-lg bg-primary/10 flex items-center justify-center mt-0.5 flex-shrink-0">
          <div className="h-1.5 w-1.5 rounded-full bg-primary" />
        </div>
      )}
      <div className={cn("max-w-[85%]", isUser && "flex flex-col items-end")}>
        {message.content && (
          <div className={cn(
            "rounded-2xl px-4 py-2.5",
            isUser ? "bg-primary text-primary-foreground" : "bg-card border border-border"
          )}>
            {isUser ? (
              <p className="text-sm leading-relaxed">{message.content}</p>
            ) : (
              <ReactMarkdown 
                className="text-sm prose prose-sm prose-slate max-w-none dark:prose-invert [&>*:first-child]:mt-0 [&>*:last-child]:mb-0"
              >
                {message.content}
              </ReactMarkdown>
            )}
          </div>
        )}
      </div>
    </div>
  );
}