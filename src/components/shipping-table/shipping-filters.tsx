import React, { useState, useRef, useEffect } from 'react';
import { Calendar, Filter, X, ChevronDown } from 'lucide-react';
import { STATUS_LABELS } from '../../constants/statusOptions';
import { useAuth } from '../../context/auth-context';
import { useLanguage } from '../../context/language-context';
import './shipping-filters.css';

export interface FilterOptions {
    dateFrom: string;
    dateTo: string;
    month: string;
    status: string;
    sortBy: 'recent' | 'old' | 'etd' | 'eta' | 'client';
    sortOrder: 'asc' | 'desc';
    searchTerm: string;
}

interface ShippingFiltersProps {
    filters: FilterOptions;
    onFiltersChange: (filters: FilterOptions) => void;
    onClearFilters: () => void;
}

const ShippingFilters: React.FC<ShippingFiltersProps> = ({
    filters,
    onFiltersChange,
    onClearFilters,
}) => {
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const { isAdmin } = useAuth();
    const { translations } = useLanguage();

    // Fechar dropdown ao clicar fora
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsDropdownOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    const handleInputChange = (field: keyof FilterOptions, value: string) => {
        onFiltersChange({
            ...filters,
            [field]: value,
        });
    };

    const handleSortChange = (sortBy: FilterOptions['sortBy']) => {
        const newSortOrder = filters.sortBy === sortBy && filters.sortOrder === 'desc' ? 'asc' : 'desc';
        onFiltersChange({
            ...filters,
            sortBy,
            sortOrder: newSortOrder,
        });
    };

    const getMonthOptions = () => {
        const months = [
            { value: '', label: 'Todos os meses' },
            { value: '01', label: 'Janeiro' },
            { value: '02', label: 'Fevereiro' },
            { value: '03', label: 'Março' },
            { value: '04', label: 'Abril' },
            { value: '05', label: 'Maio' },
            { value: '06', label: 'Junho' },
            { value: '07', label: 'Julho' },
            { value: '08', label: 'Agosto' },
            { value: '09', label: 'Setembro' },
            { value: '10', label: 'Outubro' },
            { value: '11', label: 'Novembro' },
            { value: '12', label: 'Dezembro' },
        ];
        return months;
    };

    const hasActiveFilters = () => {
        return (
            filters.dateFrom ||
            filters.dateTo ||
            filters.month ||
            filters.status ||
            filters.searchTerm ||
            filters.sortBy !== 'recent'
        );
    };

    const getActiveFiltersCount = () => {
        let count = 0;
        if (filters.dateFrom || filters.dateTo) count++;
        if (filters.month) count++;
        if (filters.status) count++;
        if (filters.searchTerm) count++;
        if (filters.sortBy !== 'recent') count++;
        return count;
    };

    const getSortLabel = () => {
        const sortLabels = {
            recent: translations.mostRecent,
            old: translations.oldest,
            etd: translations.etdDate,
            eta: translations.etaDate,
            client: translations.clientAZ
        };
        return sortLabels[filters.sortBy];
    };

    const getSortOptions = () => {
        const baseOptions = [
            { value: 'recent', label: translations.mostRecent },
            { value: 'old', label: translations.oldest },
            { value: 'etd', label: translations.etdDate },
            { value: 'eta', label: translations.etaDate },
        ];

        // Adicionar opção "Cliente A-Z" apenas para admins
        if (isAdmin()) {
            baseOptions.push({ value: 'client', label: translations.clientAZ });
        }

        return baseOptions;
    };

    const getMonthLabel = () => {
        if (!filters.month) return translations.allMonths;
        const month = getMonthOptions().find(m => m.value === filters.month);
        return month ? month.label : translations.allMonths;
    };

    return (
        <div className="shipping-filters" ref={dropdownRef}>
            <div className="filters-header">
                <div className="filters-title">
                    <Filter size={18} />
                    <span>{translations.searchFilters}</span>
                    {hasActiveFilters() && (
                        <span className="active-filters-badge">
                            {getActiveFiltersCount()}
                        </span>
                    )}
                </div>
                <div className="filters-actions">
                    {hasActiveFilters() && (
                        <button
                            className="clear-filters-btn"
                            onClick={onClearFilters}
                            title="Limpar filtros"
                        >
                            <X size={16} />
                            Limpar
                        </button>
                    )}
                    <button
                        className={`dropdown-toggle-btn ${isDropdownOpen ? 'open' : ''}`}
                        onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                    >
                        <ChevronDown size={16} />
                        {isDropdownOpen ? translations.less : translations.more}
                    </button>
                </div>
            </div>

            {/* Linha principal - sempre visível */}
            <div className="filters-main">
                {/* Campo de busca - disponível para todos */}
                <div className="filter-group search-group">
                    <input
                        type="text"
                        value={filters.searchTerm}
                        onChange={(e) => handleInputChange('searchTerm', e.target.value)}
                        placeholder={isAdmin() ? translations.searchPlaceholderAdmin : translations.searchPlaceholderClient}
                        className="search-input"
                    />
                </div>

                <div className="filter-group status-group">
                    <select
                        value={filters.status}
                        onChange={(e) => handleInputChange('status', e.target.value)}
                        className="status-select"
                        aria-label={translations.status}
                    >
                        <option value="">{translations.allStatuses}</option>
                        {Object.entries(STATUS_LABELS).map(([value, label]) => (
                            <option key={value} value={value}>
                                {label}
                            </option>
                        ))}
                    </select>
                </div>

                <div className="filter-summary">
                    <span className="filter-summary-item">
                        <strong>{translations.sortBy}</strong> {getSortLabel()}
                    </span>
                    <span className="filter-summary-separator">•</span>
                    <span className="filter-summary-item">
                        <strong>{translations.month}</strong> {getMonthLabel()}
                    </span>
                </div>
            </div>

            {/* Dropdown com todos os filtros */}
            {isDropdownOpen && (
                <div className="filters-dropdown">
                    <div className="filters-row">
                        <div className="filter-group">
                            <label>Ordenar por:</label>
                            <select
                                value={filters.sortBy}
                                onChange={(e) => handleSortChange(e.target.value as FilterOptions['sortBy'])}
                                className="sort-select"
                            >
                                {getSortOptions().map(option => (
                                    <option key={option.value} value={option.value}>
                                        {option.label}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="filter-group">
                            <label>Ordem:</label>
                            <select
                                value={filters.sortOrder}
                                onChange={(e) => handleInputChange('sortOrder', e.target.value)}
                                className="order-select"
                            >
                                <option value="desc">Decrescente</option>
                                <option value="asc">Crescente</option>
                            </select>
                        </div>

                        <div className="filter-group">
                            <label>Mês de Origem:</label>
                            <select
                                value={filters.month}
                                onChange={(e) => handleInputChange('month', e.target.value)}
                                className="month-select"
                            >
                                {getMonthOptions().map(month => (
                                    <option key={month.value} value={month.value}>
                                        {month.label}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="filters-row">
                        <div className="filter-group">
                            <label>
                                <Calendar size={14} />
                                Data de:
                            </label>
                            <input
                                type="date"
                                value={filters.dateFrom}
                                onChange={(e) => handleInputChange('dateFrom', e.target.value)}
                                className="date-input"
                            />
                        </div>

                        <div className="filter-group">
                            <label>
                                <Calendar size={14} />
                                Data até:
                            </label>
                            <input
                                type="date"
                                value={filters.dateTo}
                                onChange={(e) => handleInputChange('dateTo', e.target.value)}
                                className="date-input"
                            />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ShippingFilters; 