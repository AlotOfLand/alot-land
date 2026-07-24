import { PDFDownloadLink } from '@react-pdf/renderer';
import ReportDocument from './ReportDocument';

export default function ReportButton({ deal, scenario, agent }) {
  const name = `${(deal.address || 'deal').replace(/[^a-z0-9]+/gi, '-').toLowerCase()}-report.pdf`;
  return (
    <PDFDownloadLink
      document={<ReportDocument deal={deal} scenario={scenario} agent={agent} />}
      fileName={name}
      className="btn-primary"
    >
      {({ loading }) => (loading ? 'Building PDF…' : 'PDF report')}
    </PDFDownloadLink>
  );
}
