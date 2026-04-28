import React from 'react';

const RosteredStaffPrintStyles: React.FC = () => {
  return (
    <style>{`
      @media print {
        @page {
          size: auto;
          margin: 8mm;
        }

        html,
        body {
          background: #ffffff !important;
        }

        body * {
          visibility: hidden !important;
        }

        .roster-print-area,
        .roster-print-area * {
          visibility: visible !important;
        }

        .roster-print-area {
          position: absolute !important;
          left: 0 !important;
          top: 0 !important;
          width: 100% !important;
          overflow: visible !important;
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
          color-adjust: exact !important;
        }

        .roster-print-area * {
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
          color-adjust: exact !important;
        }

        .roster-print-area table {
          width: 100% !important;
          min-width: 0 !important;
          table-layout: fixed !important;
          font-size: 10px !important;
        }

        .roster-print-area thead {
          position: static !important;
          display: table-row-group !important;
        }

        .roster-print-area tfoot {
          display: table-row-group !important;
        }

        .roster-print-area th,
        .roster-print-area td {
          position: static !important;
          box-shadow: none !important;
        }

        .roster-print-area button,
        .print-hidden {
          display: none !important;
        }

        .print-signature-row {
          break-inside: avoid-page !important;
          page-break-inside: avoid !important;
        }

        .print-signature-row td {
          text-align: left !important;
          padding: 28px 24px 20px 0 !important;
          border: none !important;
          background: #ffffff !important;
          break-inside: avoid-page !important;
          page-break-inside: avoid !important;
        }

        .print-signature-row .print-signature-title {
          width: 260px !important;
          margin-left: auto !important;
          font-size: 20px !important;
          font-weight: 700 !important;
          line-height: 1.35 !important;
          margin-bottom: 70px !important;
          text-align: center !important;
        }

        .print-signature-row .print-signature-name {
          width: 260px !important;
          margin-left: auto !important;
          font-size: 18px !important;
          font-weight: 700 !important;
          text-transform: uppercase !important;
          letter-spacing: 0.5px !important;
          text-align: center !important;
        }

        .print-only-general-manager,
        .print-only-creator,
        .print-only-manager-title {
          display: table-row !important;
        }

        .print-only-main-title {
          display: block !important;
          text-align: center !important;
          margin: 0 0 26px 0 !important;
          padding: 0 !important;
        }

        .print-only-cns-title {
          display: table-row !important;
          break-after: avoid-page !important;
          page-break-after: avoid !important;
        }

        .print-only-support-title {
          display: table-row !important;
          break-after: avoid-page !important;
          page-break-after: avoid !important;
        }

        .print-only-cns-title td {
          border: none !important;
          background: #ffffff !important;
          text-align: center !important;
          padding: 0 0 26px 0 !important;
        }

        .print-only-support-title td {
          border: none !important;
          background: #ffffff !important;
          text-align: center !important;
          padding: 0 0 26px 0 !important;
        }

        .print-only-manager-title td {
          border: none !important;
          background: #ffffff !important;
          text-align: center !important;
          padding: 0 0 10px 0 !important;
        }

        .print-only-manager-title .print-roster-title,
        .print-only-cns-title .print-roster-title,
        .print-only-support-title .print-roster-title,
        .print-only-main-title .print-roster-title {
          font-size: 28px !important;
          font-weight: 800 !important;
          line-height: 1.2 !important;
          letter-spacing: 0.6px !important;
          text-transform: uppercase !important;
        }

        .print-only-manager-title .print-roster-subtitle,
        .print-only-cns-title .print-roster-subtitle,
        .print-only-support-title .print-roster-subtitle,
        .print-only-main-title .print-roster-subtitle {
          margin-top: 4px !important;
          font-size: 24px !important;
          font-weight: 800 !important;
          line-height: 1.2 !important;
          text-transform: uppercase !important;
        }

        .print-only-manager-title .print-roster-date,
        .print-only-cns-title .print-roster-date,
        .print-only-support-title .print-roster-date,
        .print-only-main-title .print-roster-date {
          margin-top: 4px !important;
          font-size: 18px !important;
          font-weight: 700 !important;
          line-height: 1.25 !important;
          text-transform: uppercase !important;
        }

        .print-type-header .print-section-date {
          display: block !important;
          margin-top: 2px !important;
          font-size: 11px !important;
          font-weight: 600 !important;
          line-height: 1.2 !important;
          color: rgba(255, 255, 255, 0.9) !important;
          text-transform: uppercase !important;
        }

        .print-section-columns-header {
          display: table-row !important;
          break-after: avoid-page !important;
          page-break-after: avoid !important;
        }

        .print-section-columns-header .print-col-header {
          background: #222e6a !important;
          color: #ffffff !important;
          border: 1px solid #1a235c !important;
          text-align: center !important;
          padding: 4px 2px !important;
          font-weight: 700 !important;
          vertical-align: middle !important;
        }

        .print-section-columns-header .print-col-label {
          font-size: 10px !important;
          white-space: nowrap !important;
        }

        .print-section-columns-header .print-col-day {
          width: 24px !important;
          min-width: 24px !important;
          max-width: 24px !important;
          padding: 3px 1px !important;
        }

        .print-section-columns-header .print-col-day-name {
          font-size: 8px !important;
          line-height: 1.1 !important;
          color: rgba(255, 255, 255, 0.75) !important;
        }

        .print-section-columns-header .print-col-day-number {
          font-size: 9px !important;
          line-height: 1.1 !important;
          margin-top: 1px !important;
        }

        .print-section-columns-header .print-col-tail {
          width: 10px !important;
        }

        .print-break-before {
          break-before: page;
          page-break-before: always;
        }
      }
    `}</style>
  );
};

export default RosteredStaffPrintStyles;
