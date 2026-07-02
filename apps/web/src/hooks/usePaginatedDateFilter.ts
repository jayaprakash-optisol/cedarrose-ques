import { useState } from "react";

export function usePaginatedDateFilter(initialLimit: number) {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(initialLimit);

  return { from, setFrom, to, setTo, page, setPage, limit, setLimit };
}
