// hooks/usePagination.js
import { useState, useCallback, useEffect } from 'react';

export const usePagination = (pageSize = 20) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [totalItems, setTotalItems] = useState(0);
  const [hasMore, setHasMore] = useState(false);

  const calculateOffset = useCallback(() => {
    return (currentPage - 1) * pageSize;
  }, [currentPage, pageSize]);

  const updatePaginationInfo = useCallback(
    total => {
      setTotalItems(total);
      const pages = Math.ceil(total / pageSize);
      setTotalPages(pages);
      setHasMore(currentPage < pages);
    },
    [currentPage, pageSize]
  );

  const nextPage = useCallback(() => {
    if (hasMore) {
      setCurrentPage(prev => prev + 1);
    }
  }, [hasMore]);

  const previousPage = useCallback(() => {
    if (currentPage > 1) {
      setCurrentPage(prev => prev - 1);
    }
  }, [currentPage]);

  const goToPage = useCallback(
    page => {
      if (page >= 1 && page <= totalPages) {
        setCurrentPage(page);
      }
    },
    [totalPages]
  );

  const reset = useCallback(() => {
    setCurrentPage(1);
    setTotalPages(0);
    setTotalItems(0);
    setHasMore(false);
  }, []);

  return {
    currentPage,
    totalPages,
    totalItems,
    hasMore,
    pageSize,
    offset: calculateOffset(),
    nextPage,
    previousPage,
    goToPage,
    reset,
    updatePaginationInfo,
    canGoPrevious: currentPage > 1,
    canGoNext: hasMore
  };
};
