import React, { useState } from 'react';
import { Plus, Edit2, Trash2 } from 'lucide-react';
import Tag from '../../components/common/Tag';
import './Sites.css';

const Sites = () => {
    // Mock Data as requested
    const [sites] = useState([
        {
            id: 1,
            name: "Downtown Restaurant",
            code: "BR-001",
            address: "123 Main Street, Downtown",
            city: "Mumbai",
            phone: "+91 98765 43210",
            manager: "Rajesh Kumar",
            hours: "11:00 AM - 11:00 PM",
            status: "active",
            employees: 18
        },
        {
            id: 2,
            name: "Mall Food Court",
            code: "BR-002",
            address: "Phoenix Mall, 4th Floor",
            city: "Mumbai",
            phone: "+91 98765 43211",
            manager: "Priya Sharma",
            hours: "10:00 AM - 10:00 PM",
            status: "active",
            employees: 22
        },
        {
            id: 3,
            name: "Airport Terminal",
            code: "BR-003",
            address: "Terminal 2, International Airport",
            city: "Mumbai",
            phone: "+91 98765 43212",
            manager: "Amit Patel",
            hours: "24 Hours",
            status: "active",
            employees: 15
        }
    ]);

    const [searchQuery, setSearchQuery] = useState('');

    const filteredSites = sites.filter(site =>
        site.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        site.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
        site.city.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const getStatusColor = (status) => {
        return status === 'active' ? 'success' : 'danger';
    };

    return (
        <div className="sites-page">
            <div className="sites-header">
                <div>
                    <h1 className="sites-title">Restaurant Branches</h1>
                    <p className="sites-subtitle">Manage restaurant locations and details</p>
                </div>
                <button className="btn-primary">
                    <Plus size={16} />
                    Add Branch
                </button>
            </div>

            <div className="sites-toolbar">
                <div className="sites-search">
                    <input
                        type="text"
                        placeholder="Search branches..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="search-input"
                    />
                </div>
            </div>

            <div className="sites-table-container">
                <table className="sites-table">
                    <thead>
                        <tr>
                            <th>Branch ID</th>
                            <th>Branch Name</th>
                            <th>Manager</th>
                            <th>City</th>
                            <th>Phone</th>
                            <th>Opening Hours</th>
                            <th>Employees</th>
                            <th>Status</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredSites.map(site => (
                            <tr key={site.id}>
                                <td className="site-id">{site.code}</td>
                                <td>
                                    <div className="site-name">{site.name}</div>
                                    <div className="site-address">{site.address}</div>
                                </td>
                                <td>{site.manager}</td>
                                <td>{site.city}</td>
                                <td>{site.phone}</td>
                                <td>{site.hours}</td>
                                <td>
                                    <Tag color="info">{site.employees} Staff</Tag>
                                </td>
                                <td>
                                    <Tag color={getStatusColor(site.status)}>
                                        {site.status}
                                    </Tag>
                                </td>
                                <td>
                                    <div className="action-buttons">
                                        <button className="action-btn action-btn-edit" title="Edit">
                                            <Edit2 size={14} />
                                        </button>
                                        <button className="action-btn action-btn-delete" title="Delete">
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <div className="sites-summary">
                Showing {filteredSites.length} of {sites.length} branches
            </div>
        </div>
    );
};

export default Sites;
