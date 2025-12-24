import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { motion } from 'framer-motion';
import {
  Plus,
  Search,
  Filter,
  Scissors,
  Clock,
  CheckCircle,
  AlertTriangle,
  Calendar,
  User,
} from 'lucide-react';
import { db } from '../../../database';
import { format } from 'date-fns';
import type { Surgery } from '../../../types';

export default function SurgeryListPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');

  const surgeries = useLiveQuery(
    () => db.surgeries.orderBy('scheduledDate').reverse().toArray(),
    []
  );

  const patients = useLiveQuery(() => db.patients.toArray(), []);

  const patientMap = useMemo(() => {
    const map = new Map();
    patients?.forEach(p => map.set(p.id, p));
    return map;
  }, [patients]);

  const filteredSurgeries = useMemo(() => {
    if (!surgeries) return [];

    return surgeries.filter((surgery) => {
      const patient = patientMap.get(surgery.patientId);
      const matchesSearch = searchQuery === '' ||
        surgery.procedureName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (patient && `${patient.firstName} ${patient.lastName}`.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesStatus = statusFilter === 'all' || surgery.status === statusFilter;
      const matchesType = typeFilter === 'all' || surgery.type === typeFilter;

      return matchesSearch && matchesStatus && matchesType;
    });
  }, [surgeries, searchQuery, statusFilter, typeFilter, patientMap]);

  const getStatusBadge = (status: Surgery['status']) => {
    switch (status) {
      case 'scheduled':
        return <span className="badge badge-info"><Clock size={12} /> Scheduled</span>;
      case 'in-progress':
        return <span className="badge badge-warning"><AlertTriangle size={12} /> In Progress</span>;
      case 'completed':
        return <span className="badge badge-success"><CheckCircle size={12} /> Completed</span>;
      case 'postponed':
        return <span className="badge badge-secondary">Postponed</span>;
      case 'cancelled':
        return <span className="badge badge-danger">Cancelled</span>;
      default:
        return null;
    }
  };

  const stats = useMemo(() => {
    if (!surgeries) return { scheduled: 0, inProgress: 0, completed: 0, today: 0 };
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    return {
      scheduled: surgeries.filter(s => s.status === 'scheduled').length,
      inProgress: surgeries.filter(s => s.status === 'in-progress').length,
      completed: surgeries.filter(s => s.status === 'completed').length,
      today: surgeries.filter(s => {
        const scheduledDate = new Date(s.scheduledDate);
        return scheduledDate >= today && scheduledDate < tomorrow;
      }).length,
    };
  }, [surgeries]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
            <Scissors className="w-7 h-7 text-purple-500" />
            Surgery Schedule
          </h1>
          <p className="text-gray-600 mt-1">
            Manage surgical procedures and operating room schedules
          </p>
        </div>
        <Link to="/patients" className="btn btn-primary">
          <Plus size={18} />
          Schedule Surgery
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="card p-4"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-100 rounded-lg">
              <Calendar className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{stats.today}</p>
              <p className="text-sm text-gray-500">Today</p>
            </div>
          </div>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="card p-4"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 bg-sky-100 rounded-lg">
              <Clock className="w-5 h-5 text-sky-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{stats.scheduled}</p>
              <p className="text-sm text-gray-500">Scheduled</p>
            </div>
          </div>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="card p-4"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 bg-orange-100 rounded-lg">
              <AlertTriangle className="w-5 h-5 text-orange-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{stats.inProgress}</p>
              <p className="text-sm text-gray-500">In Progress</p>
            </div>
          </div>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="card p-4"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-100 rounded-lg">
              <CheckCircle className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{stats.completed}</p>
              <p className="text-sm text-gray-500">Completed</p>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Filters */}
      <div className="card p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search
              size={18}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by procedure or patient name..."
              className="input pl-10"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter size={18} className="text-gray-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="input w-auto"
            >
              <option value="all">All Status</option>
              <option value="scheduled">Scheduled</option>
              <option value="in-progress">In Progress</option>
              <option value="completed">Completed</option>
              <option value="postponed">Postponed</option>
              <option value="cancelled">Cancelled</option>
            </select>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="input w-auto"
            >
              <option value="all">All Types</option>
              <option value="elective">Elective</option>
              <option value="emergency">Emergency</option>
            </select>
          </div>
        </div>
      </div>

      {/* Surgery List */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Procedure
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Patient
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Scheduled Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  ASA Score
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredSurgeries.length > 0 ? (
                filteredSurgeries.map((surgery, index) => {
                  const patient = patientMap.get(surgery.patientId);
                  return (
                    <motion.tr
                      key={surgery.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.2, delay: index * 0.05 }}
                      className="hover:bg-gray-50 cursor-pointer"
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-purple-100 rounded-lg">
                            <Scissors className="w-5 h-5 text-purple-600" />
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">{surgery.procedureName}</p>
                            <p className="text-sm text-gray-500">{surgery.category} surgery</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {patient ? (
                          <div className="flex items-center gap-2">
                            <User className="w-4 h-4 text-gray-400" />
                            <div>
                              <p className="font-medium text-gray-900">
                                {patient.firstName} {patient.lastName}
                              </p>
                              <p className="text-sm text-gray-500">{patient.hospitalNumber}</p>
                            </div>
                          </div>
                        ) : (
                          <span className="text-gray-400">Unknown</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {format(new Date(surgery.scheduledDate), 'MMM d, yyyy h:mm a')}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`badge ${surgery.type === 'emergency' ? 'badge-danger' : 'badge-info'}`}>
                          {surgery.type}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        {getStatusBadge(surgery.status)}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full font-bold ${
                          surgery.preOperativeAssessment.asaScore === 1 ? 'bg-emerald-100 text-emerald-700' :
                          surgery.preOperativeAssessment.asaScore === 2 ? 'bg-sky-100 text-sky-700' :
                          surgery.preOperativeAssessment.asaScore === 3 ? 'bg-amber-100 text-amber-700' :
                          surgery.preOperativeAssessment.asaScore === 4 ? 'bg-orange-100 text-orange-700' :
                          'bg-red-100 text-red-700'
                        }`}>
                          {surgery.preOperativeAssessment.asaScore}
                        </span>
                      </td>
                    </motion.tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center">
                    <div className="text-gray-500">
                      <Scissors className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                      <p className="font-medium">No surgeries found</p>
                      <p className="text-sm mt-1">
                        {searchQuery || statusFilter !== 'all'
                          ? 'Try adjusting your search criteria'
                          : 'Schedule your first surgery to get started'}
                      </p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
