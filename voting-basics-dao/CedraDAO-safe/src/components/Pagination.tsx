import React from 'react';
import { ChevronLeft, ChevronRight, MoreHorizontal } from 'lucide-react';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  limit: number;
  onPageChange: (page: number) => void;
  onLimitChange?: (limit: number) => void;
  className?: string;
  showLimitSelector?: boolean;
  showItemsInfo?: boolean;
}

const Pagination: React.FC<PaginationProps> = ({
  currentPage,
  totalPages,
  totalItems,
  hasNextPage,
  hasPreviousPage,
  limit,
  onPageChange,
  onLimitChange,
  className = '',
  showLimitSelector = true,
  showItemsInfo = true
}) => {
  const getVisiblePages = () => {
    const delta = 2;
    const range = [];
    const rangeWithDots = [];

    for (let i = Math.max(2, currentPage - delta); i <= Math.min(totalPages - 1, currentPage + delta); i++) {
      range.push(i);
    }

    if (currentPage - delta > 2) {
      rangeWithDots.push(1, '...');
    } else {
      rangeWithDots.push(1);
    }

    rangeWithDots.push(...range);

    if (currentPage + delta < totalPages - 1) {
      rangeWithDots.push('...', totalPages);
    } else if (totalPages > 1) {
      rangeWithDots.push(totalPages);
    }

    // Remove duplicates
    return rangeWithDots.filter((item, index, arr) => arr.indexOf(item) === index);
  };

  const visiblePages = getVisiblePages();
  const startItem = (currentPage - 1) * limit + 1;
  const endItem = Math.min(currentPage * limit, totalItems);

  if (totalPages <= 1) {
    return null;
  }

  return (
    <div className={`flex flex-col sm:flex-row items-center justify-between space-y-3 sm:space-y-0 ${className}`}>
      {/* Items info */}
      {showItemsInfo && (
        <div className="text-sm text-gray-400">
          Showing {startItem} to {endItem} of {totalItems} activities
        </div>
      )}

      {/* Pagination controls */}
      <div className="flex items-center space-x-2">
        {/* Previous button */}
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={!hasPreviousPage}
          className="flex items-center px-3 py-2 text-sm font-medium text-gray-300 bg-white/5 border border-white/10 rounded-lg hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronLeft className="w-4 h-4 mr-1" />
          Previous
        </button>

        {/* Page numbers */}
        <div className="flex items-center space-x-1">
          {visiblePages.map((page, index) => (
            <React.Fragment key={index}>
              {page === '...' ? (
                <span className="px-3 py-2 text-gray-400">
                  <MoreHorizontal className="w-4 h-4" />
                </span>
              ) : (
                <button
                  onClick={() => onPageChange(Number(page))}
                  className={`px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                    currentPage === page
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-300 bg-white/5 border border-white/10 hover:bg-white/10'
                  }`}
                >
                  {page}
                </button>
              )}
            </React.Fragment>
          ))}
        </div>

        {/* Next button */}
        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={!hasNextPage}
          className="flex items-center px-3 py-2 text-sm font-medium text-gray-300 bg-white/5 border border-white/10 rounded-lg hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          Next
          <ChevronRight className="w-4 h-4 ml-1" />
        </button>
      </div>

      {/* Items per page selector */}
      {showLimitSelector && onLimitChange && (
        <div className="flex items-center space-x-2 text-sm">
          <span className="text-gray-400">Show:</span>
          <select
            value={limit}
            onChange={(e) => onLimitChange(Number(e.target.value))}
            className="professional-input px-2 py-1 rounded"
          >
            <option value={10}>10</option>
            <option value={25}>25</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
          </select>
          <span className="text-gray-400">per page</span>
        </div>
      )}
    </div>
  );
};

export default Pagination;