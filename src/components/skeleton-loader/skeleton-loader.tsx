"use client";

import React from "react";
import "./skeleton-loader.css";

interface SkeletonLoaderProps {
  type?: "text" | "card" | "table" | "circle" | "custom";
  width?: string | number;
  height?: string | number;
  className?: string;
  count?: number;
}

export const SkeletonLoader: React.FC<SkeletonLoaderProps> = ({
  type = "text",
  width,
  height,
  className = "",
  count = 1,
}) => {
  const getSkeletonClass = () => {
    switch (type) {
      case "card":
        return "skeleton-card";
      case "table":
        return "skeleton-table";
      case "circle":
        return "skeleton-circle";
      case "custom":
        return "skeleton-custom";
      default:
        return "skeleton-text";
    }
  };

  const style: React.CSSProperties = {};
  if (width) style.width = typeof width === "number" ? `${width}px` : width;
  if (height) style.height = typeof height === "number" ? `${height}px` : height;

  if (count === 1) {
    return (
      <div
        className={`skeleton-loader ${getSkeletonClass()} ${className}`}
        style={style}
        aria-label="Loading..."
      />
    );
  }

  return (
    <>
      {Array.from({ length: count }).map((_, index) => (
        <div
          key={index}
          className={`skeleton-loader ${getSkeletonClass()} ${className}`}
          style={style}
          aria-label="Loading..."
        />
      ))}
    </>
  );
};

// Componente específico para cards de estatísticas
export const StatCardSkeleton: React.FC = () => {
  return (
    <div className="stat-card-skeleton">
      <div className="skeleton-loader skeleton-circle" style={{ width: 48, height: 48 }} />
      <div className="stat-skeleton-content">
        <div className="skeleton-loader skeleton-text" style={{ width: "60%", height: 16, marginBottom: 8 }} />
        <div className="skeleton-loader skeleton-text" style={{ width: "40%", height: 24 }} />
      </div>
    </div>
  );
};

// Componente para tabela
export const TableSkeleton: React.FC<{ rows?: number; columns?: number }> = ({
  rows = 5,
  columns = 6,
}) => {
  return (
    <div className="table-skeleton">
      <div className="table-skeleton-header">
        {Array.from({ length: columns }).map((_, i) => (
          <div key={i} className="skeleton-loader skeleton-text" style={{ height: 20 }} />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div key={rowIndex} className="table-skeleton-row">
          {Array.from({ length: columns }).map((_, colIndex) => (
            <div key={colIndex} className="skeleton-loader skeleton-text" style={{ height: 16 }} />
          ))}
        </div>
      ))}
    </div>
  );
};

export default SkeletonLoader;




