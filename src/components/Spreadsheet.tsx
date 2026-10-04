import React, { useEffect, useRef, useImperativeHandle, forwardRef } from 'react';
import jspreadsheet from 'jspreadsheet-ce';

interface SpreadsheetProps {
  data: any[][];
  columns: any[];
  onchange?: (instance: any, cell: any, x: any, y: any, value: any) => void;
  oninsertrow?: (instance: any) => void;
  ondeleterow?: (instance: any) => void;
  onDataChange?: (newData: any[][]) => void;
}

export interface SpreadsheetRef {
  getInstance: () => any;
}

const Spreadsheet = forwardRef<SpreadsheetRef, SpreadsheetProps>(({ data, columns, onchange, oninsertrow, ondeleterow, onDataChange }, ref) => {
  const jRef = useRef<HTMLDivElement>(null);
  const instance = useRef<any>(null);
  const isInternalChange = useRef(false);
  const onchangeRef = useRef(onchange);
  const onDataChangeRef = useRef(onDataChange);

  useImperativeHandle(ref, () => ({
    getInstance: () => instance.current
  }));

  useEffect(() => {
    onchangeRef.current = onchange;
  }, [onchange]);

  useEffect(() => {
    onDataChangeRef.current = onDataChange;
  }, [onDataChange]);

  const handleDataChange = (inst: any) => {
    isInternalChange.current = true;
    if (onDataChangeRef.current && inst && typeof inst.getData === 'function') {
      onDataChangeRef.current(inst.getData());
    }
  };

  const handleChange = (inst: any, cell: any, x: any, y: any, value: any) => {
    isInternalChange.current = true;
    if (onchangeRef.current) {
      onchangeRef.current(inst, cell, x, y, value);
    }
    handleDataChange(inst);
  };

  const handleInsertRow = (inst: any, rowNumber: any, numOfRows: any, rowRecords: any, insertBefore: any) => {
    isInternalChange.current = true;
    
    try {
      const sheet = Array.isArray(inst) ? inst[0] : inst;
      if (sheet && typeof sheet.getValue === 'function' && typeof sheet.setValue === 'function') {
        const refRowIdx = insertBefore ? (rowNumber > 0 ? rowNumber - 1 : rowNumber + numOfRows) : rowNumber;
        const id = sheet.getValue(`A${refRowIdx + 1}`);
        
        if (id) {
          const startRow = insertBefore ? rowNumber : rowNumber + 1;
          for (let i = 0; i < numOfRows; i++) {
            sheet.setValue(`A${startRow + i + 1}`, id);
          }
        }
      }
    } catch (e) {
      console.error("Error auto-filling ID on insert row", e);
    }

    if (oninsertrow) oninsertrow(inst);
    handleDataChange(inst);
  };

  const handleDeleteRow = (inst: any, rowNumber: any, numOfRows: any, rowRecords: any) => {
    isInternalChange.current = true;
    if (ondeleterow) ondeleterow(inst);
    handleDataChange(inst);
  };

  useEffect(() => {
    if (jRef.current && !instance.current) {
      instance.current = (jspreadsheet as any)(jRef.current, {
        worksheets: [{
          data,
          columns,
          allowInsertColumn: false,
          allowDeleteColumn: false,
          columnSorting: true,
          columnDrag: true,
          columnResize: true,
          rowDrag: true,
          search: true,
          pagination: 10,
          tableOverflow: true,
          tableWidth: '100%',
          tableHeight: '400px',
        }],
        onchange: handleChange,
        oninsertrow: handleInsertRow,
        ondeleterow: handleDeleteRow,
      });
    }

    return () => {
      if (instance.current && jRef.current) {
        try {
          (jspreadsheet as any).destroy(jRef.current);
        } catch (e) {
          console.error("Error destroying jspreadsheet", e);
        }
        instance.current = null;
        if (jRef.current) {
          jRef.current.innerHTML = '';
        }
      }
    };
  }, []);

  // Update data if it changes externally
  useEffect(() => {
    if (instance.current && data) {
      if (isInternalChange.current) {
        isInternalChange.current = false;
        return;
      }
      try {
        const sheet = Array.isArray(instance.current) ? instance.current[0] : instance.current;
        if (sheet && sheet.setData) {
          sheet.setData(data);
        }
      } catch (e) {
        console.error("Error setting data in jspreadsheet", e);
      }
    }
  }, [data]);

  return <div ref={jRef} className="w-full overflow-hidden rounded-xl border border-neutral-200 shadow-sm" />;
});

export default Spreadsheet;
