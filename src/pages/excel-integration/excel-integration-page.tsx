import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../../context/language-context';
import { useShipments } from '../../context/shipments-context';
import Navbar from '../../components/navbar/navbar';
import ChatAssistant from '../../components/chat-assistant/chat-assistant';
import ExcelIntegration from '../../components/excel-integration/excel-integration';
import ExcelTest from '../../components/excel-test/excel-test';
import './excel-integration-page.css';

const ExcelIntegrationPage: React.FC = () => {
    const { translations } = useLanguage();
    const { shipments, setShipments } = useShipments();
    const navigate = useNavigate();
    const [useTestMode, setUseTestMode] = useState(true);

    const handleShipmentsUpdate = (updatedShipments: any[]) => {
        setShipments(updatedShipments);
    };

    return (
        <main className="excel-integration-page">
            <Navbar />
            <div className="excel-integration-page-content">
                <div className="excel-integration-wrapper">
                    <div className="excel-integration-header">
                        <h1>{translations.excelIntegration}</h1>
                        <p>{translations.useExcelAsDatabase}</p>
                    </div>

                    <div className="mode-toggle-section">
                        <div className="mode-toggle">
                            <button
                                className={`toggle-btn ${useTestMode ? 'active' : ''}`}
                                onClick={() => setUseTestMode(true)}
                            >
                                🧪 Modo Teste
                            </button>
                            <button
                                className={`toggle-btn ${!useTestMode ? 'active' : ''}`}
                                onClick={() => setUseTestMode(false)}
                            >
                                🔗 Modo Real
                            </button>
                        </div>
                    </div>

                    <div className="excel-integration-container">
                        {useTestMode ? (
                            <ExcelTest />
                        ) : (
                            <ExcelIntegration
                                shipments={shipments}
                                onShipmentsUpdate={handleShipmentsUpdate}
                            />
                        )}
                    </div>
                </div>
            </div>
            <ChatAssistant />
        </main>
    );
};

export default ExcelIntegrationPage;
