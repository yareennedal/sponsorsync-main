import React, { useState } from 'react';
import { useSponsorships } from '../hooks/useSponsorships';
import { 
  Building2, 
  Calendar, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  AlertCircle, 
  Plus, 
  Filter, 
  RefreshCw 
} from 'lucide-react';

const STATUS_BADGES = {
  DRAFT: { label: 'مسودة', bg: 'bg-gray-100 text-gray-700 border-gray-200', icon: Clock },
  PROPOSED: { label: 'مقترح', bg: 'bg-blue-50 text-blue-700 border-blue-200', icon: AlertCircle },
  NEGOTIATING: { label: 'قيد التفاوض', bg: 'bg-amber-50 text-amber-700 border-amber-200', icon: RefreshCw },
  APPROVED: { label: 'موافق عليه', bg: 'bg-emerald-50 text-emerald-700 border-emerald-200', icon: CheckCircle2 },
  REJECTED: { label: 'مرفوض', bg: 'bg-rose-50 text-rose-700 border-rose-200', icon: XCircle },
  CONTRACT_SIGNED: { label: 'عقد موقّع', bg: 'bg-purple-50 text-purple-700 border-purple-200', icon: CheckCircle2 },
  CANCELLED: { label: 'ملغي', bg: 'bg-slate-100 text-slate-600 border-slate-200', icon: XCircle },
};

export default function SponsorshipsDashboard() {
  const [selectedStatus, setSelectedStatus] = useState('');
  const { cases, loading, error, refresh, updateCaseStatus } = useSponsorships(
    selectedStatus ? { status: selectedStatus } : {}
  );

  const handleStatusChange = async (id, newStatus) => {
    try {
      await updateCaseStatus(id, newStatus);
    } catch (err) {
      alert('حدث خطأ أثناء تغيير الحالة');
    }
  };

  return (
    <div className="p-6 dir-rtl max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b pb-5">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">إدارة فرام ورك الكفالات</h1>
          <p className="text-sm text-gray-500 mt-1">متابعة وإدارة فرص ودورات حياة كفالات الفعاليات</p>
        </div>
        <button 
          onClick={refresh}
          className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition shadow-sm font-medium text-sm"
        >
          <Plus className="w-4 h-4" />
          إضافة فرصة كفالة جديدة
        </button>
      </div>

      {/* Filters Bar */}
      <div className="flex items-center gap-3 bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
        <Filter className="w-5 h-5 text-gray-400" />
        <span className="text-sm font-medium text-gray-700">تصفية حسب المرحلة:</span>
        <select
          value={selectedStatus}
          onChange={(e) => setSelectedStatus(e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm bg-gray-50 focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none"
        >
          <option value="">جميع المراحل</option>
          {Object.entries(STATUS_BADGES).map(([key, value]) => (
            <option key={key} value={key}>{value.label}</option>
          ))}
        </select>
        <button 
          onClick={refresh} 
          title="تحديث البيانات" 
          className="p-2 text-gray-500 hover:text-indigo-600 rounded-lg hover:bg-gray-100 transition mr-auto"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Loading & Error States */}
      {loading && (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-indigo-600 border-t-transparent"></div>
          <p className="text-gray-500 text-sm mt-2">جاري تحميل فرام ورك الكفالات...</p>
        </div>
      )}

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-sm">
          {error}
        </div>
      )}

      {/* Main Grid Cases */}
      {!loading && !error && (
        cases.length === 0 ? (
          <div className="text-center py-12 bg-gray-50 rounded-xl border border-dashed border-gray-200">
            <Building2 className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-600 font-medium">لا توجد حالات كفالة حالياً</p>
            <p className="text-xs text-gray-400 mt-1">يمكنك البدء بإضافة حالة كفالة جديدة من الأزرار أعلاه</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {cases.map((item) => {
              const statusInfo = STATUS_BADGES[item.status] || STATUS_BADGES.DRAFT;
              const StatusIcon = statusInfo.icon;

              return (
                <div 
                  key={item.id} 
                  className="bg-white border border-gray-100 rounded-xl p-5 shadow-sm hover:shadow-md transition flex flex-col justify-between"
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-semibold text-gray-900 text-base line-clamp-1">{item.title}</h3>
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${statusInfo.bg}`}>
                        <StatusIcon className="w-3.5 h-3.5" />
                        {statusInfo.label}
                      </span>
                    </div>

                    <p className="text-xs text-gray-500 line-clamp-2 leading-relaxed">
                      {item.notes || 'لا يوجد ملاحظات إضافية لهذا الملف.'}
                    </p>

                    <div className="pt-2 border-t border-gray-50 flex items-center justify-between text-xs text-gray-400">
                      <span className="flex items-center gap-1">
                        <Building2 className="w-3.5 h-3.5 text-gray-400" />
                        الشركة: #{item.companyId}
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-gray-400" />
                        الفعالية: #{item.eventId}
                      </span>
                    </div>
                  </div>

                  {/* Dynamic Status Switcher */}
                  <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between">
                    <span className="text-xs text-gray-500">تغيير المرحلة:</span>
                    <select
                      value={item.status}
                      onChange={(e) => handleStatusChange(item.id, e.target.value)}
                      className="text-xs border border-gray-200 rounded px-2 py-1 bg-gray-50 focus:bg-white outline-none"
                    >
                      {Object.entries(STATUS_BADGES).map(([key, val]) => (
                        <option key={key} value={key}>{val.label}</option>
                      ))}
                    </select>
                  </div>
                </div>
              );
            })}
          </div>
        )
      )}
    </div>
  );
}
