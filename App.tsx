

import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { MOCK_CLIENTS, MOCK_SERVICES, MOCK_APPOINTMENTS, MOCK_PLANS, MOCK_CLIENT_PLAN_USAGE } from './constants';
import { Client, Service, Appointment, AppointmentStatus, Car, NotificationItem, OperatingHours, AutomatedMessage, ChatMessageData, ConversationLog, MonthlyPlan, ClientPlanUsage, User, UserRole, ALL_TABS } from './types';

// --- SVG ICON COMPONENTS ---
const CalendarDaysIcon = ({ className }: { className?: string }) => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}><path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0h18M-4.5 12h22.5" /></svg>;
const UsersIcon = ({ className }: { className?: string }) => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.003c0 1.113.285 2.16.786 3.07M15 19.128c-1.113 0-2.16-.285-3.07-.786M7.5 14.25c0-1.113-.285-2.16-.786-3.07M7.5 14.25v.003c0 1.113.285 2.16.786 3.07M7.5 14.25c-1.113 0-2.16-.285-3.07-.786M7.5 14.25c1.113 0 2.16.285 3.07.786m0 0v-.003c0-1.113.285-2.16.786-3.07M5.25 9.75A3.75 3.75 0 0 1 9 6a3.75 3.75 0 0 1 3.75 3.75c0 1.113.285 2.16.786 3.07M9 6a3.75 3.75 0 0 0-3.75 3.75M9 6v.003M9 6c-1.113 0-2.16-.285-3.07-.786m0 0a3.75 3.75 0 0 0-3.07 3.07M12 6.75a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0Z" /></svg>;
const WrenchScrewdriverIcon = ({ className }: { className?: string }) => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}><path strokeLinecap="round" strokeLinejoin="round" d="M11.42 15.17 17.25 21A2.652 2.652 0 0 0 21 17.25l-5.877-5.877M11.42 15.17l2.496-3.03c.317-.384.74-.626 1.208-.766M11.42 15.17l-4.655 5.653a2.548 2.548 0 1 1-3.586-3.586l6.837-5.63m5.108-.233c.55-.164 1.163-.188 1.743-.14a4.5 4.5 0 0 0 4.486-6.336l-3.276 3.277a3.004 3.004 0 0 1-4.243-4.243l3.275-3.275a4.5 4.5 0 0 0-6.336 4.486c.046.58.298 1.193.766 1.743m0 0-3.03 2.496" /></svg>;
const ChatBubbleLeftRightIcon = ({ className }: { className?: string }) => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}><path strokeLinecap="round" strokeLinejoin="round" d="M20.25 8.511c.884.284 1.5 1.128 1.5 2.097v4.286c0 1.136-.847 2.1-1.98 2.193l-3.72-3.72a1.063 1.063 0 0 0-1.5 0l-3.72 3.72A2.123 2.123 0 0 1 3 16.897V8.511c0-.97 0.616-1.813 1.5-2.097l6.75-2.25L12 3l1.5 0.5 6.75 2.25Z" /><path strokeLinecap="round" strokeLinejoin="round" d="M3 16.897V8.511c0-1.136.847-2.1 1.98-2.193l3.72 3.72a1.063 1.063 0 0 0 1.5 0l3.72-3.72A2.123 2.123 0 0 1 21 8.511v4.286c0 .97-.616 1.813-1.5 2.097l-6.75 2.25L12 21l-1.5-.5-6.75-2.25Z" /></svg>;
const ClockIcon = ({ className }: { className?: string }) => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" /></svg>;
const CarIcon = ({ className }: { className?: string }) => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 0 1-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m3 0h1.125c.621 0 1.125-.504 1.125-1.125V14.25m-17.25 4.5v-1.875a3.375 3.375 0 0 1 3.375-3.375h9.75a3.375 3.375 0 0 1 3.375 3.375v1.875M3.375 14.25c0-1.017.394-1.97.992-2.673a3.746 3.746 0 0 1 3.04-1.575h9.75c1.135 0 2.176.42 2.986 1.173A3.75 3.75 0 0 1 20.625 14.25m-17.25 0h17.25" /></svg>;
const UserCircleIcon = ({ className }: { className?: string }) => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}><path strokeLinecap="round" strokeLinejoin="round" d="M17.982 18.725A7.488 7.488 0 0 0 12 15.75a7.488 7.488 0 0 0-5.982 2.975m11.963 0a9 9 0 1 0-11.963 0m11.963 0A8.966 8.966 0 0 1 12 21a8.966 8.966 0 0 1-5.982-2.275M15 9.75a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" /></svg>;
const ChevronDownIcon = ({ className }: { className?: string }) => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor" className={className}><path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" /></svg>;
const ShieldCheckIcon = ({ className }: { className?: string }) => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.286Zm0 13.036h.008v.017h-.008v-.017Z" /></svg>;
const PencilSquareIcon = ({ className }: { className?: string }) => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}><path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10" /></svg>;
const TrashIcon = ({ className }: { className?: string }) => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}><path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" /></svg>;
const PlusIcon = ({ className }: { className?: string }) => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>;
const XMarkIcon = ({ className }: { className?: string }) => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" /></svg>;
const PhoneIcon = ({ className }: { className?: string }) => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 0 0 2.25-2.25v-1.372c0-.516-.211-.998-.552-1.348l-2.457-2.457a1.125 1.125 0 0 0-1.585 0L14.25 12l-2.25-2.25 1.586-1.586a1.125 1.125 0 0 0 0-1.585l-2.457-2.457A2.25 2.25 0 0 0 9.096 3.75H7.5A2.25 2.25 0 0 0 5.25 6v.75Z" /></svg>;
const QrCodeIcon = ({ className }: { className?: string }) => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 4.5A.75.75 0 0 1 4.5 3.75h4.5a.75.75 0 0 1 0 1.5h-3.75v3.75a.75.75 0 0 1-1.5 0v-4.5ZM3.75 19.5v-4.5a.75.75 0 0 1 1.5 0v3.75h3.75a.75.75 0 0 1 0 1.5h-4.5A.75.75 0 0 1 3.75 19.5Zm15-15h-4.5a.75.75 0 0 1 0-1.5h4.5A.75.75 0 0 1 19.5 4.5v4.5a.75.75 0 0 1-1.5 0v-3.75h-3.75a.75.75 0 0 1 0-1.5Zm1.5 15h-3.75a.75.75 0 0 1 0-1.5h3.75v-3.75a.75.75 0 0 1 1.5 0v4.5a.75.75 0 0 1-.75.75Z" /></svg>;
const SignalIcon = ({ className }: { className?: string }) => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}><path strokeLinecap="round" strokeLinejoin="round" d="M8.288 15.038a5.25 5.25 0 0 1 7.424 0M5.136 11.886c3.87-3.87 10.154-3.87 14.024 0M19.5 3.75a16.5 16.5 0 0 0-15 0" /></svg>;
const ChatBubbleOvalLeftEllipsisIcon = ({ className }: { className?: string }) => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}><path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H8.25m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H12m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.76 9.76 0 0 1-2.53-0.441m-7.009-4.509A9.752 9.752 0 0 1 3 5.25c0-4.556 4.03-8.25 9-8.25 3.33 0 6.26 1.558 7.973 3.973" /></svg>;
const PaperAirplaneIcon = ({ className }: { className?: string }) => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}><path strokeLinecap="round" strokeLinejoin="round" d="M6 12 3.269 3.125A59.769 59.769 0 0 1 21.485 12 59.768 59.768 0 0 1 3.27 20.875L5.999 12Zm0 0h7.5" /></svg>;
const ArrowPathIcon = ({ className }: { className?: string }) => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}><path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 11.664 0l3.181-3.183m-4.991-2.691V5.25a3.375 3.375 0 0 0-3.375-3.375H8.25a3.375 3.375 0 0 0-3.375 3.375v3.152" /></svg>;
const Cog6ToothIcon = ({ className }: { className?: string }) => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}><path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-1.003 1.11-1.226M15 20.25a3.375 3.375 0 0 1-3.375-3.375V15.75a3.375 3.375 0 0 1 3.375-3.375v4.875c0 .339.04.672.117.992M15 20.25v-4.875c0-1.85-1.503-3.375-3.375-3.375H10.5a3.375 3.375 0 0 1-3.375-3.375V11.25c0-1.85 1.503-3.375 3.375-3.375h.375M9.094 15.122A3.375 3.375 0 0 0 12.122 12h.375a3.375 3.375 0 0 0 3.375-3.375V8.25c0-1.85-1.503-3.375-3.375-3.375h-3.375a3.375 3.375 0 0 0-3.375 3.375v.375c0 .339.04.672.117.992M12 12v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m4.125 0H12m-3.375 0a3.375 3.375 0 0 1 3.375-3.375h.375m-3.375 0c.339 0 .672.04 1.002.117M12 12h3.375a3.375 3.375 0 0 1 3.375 3.375v.375c0 .339-.04.672-.117.992M12 12v4.875c0 1.85 1.503 3.375 3.375 3.375h.375a3.375 3.375 0 0 0 3.375-3.375V15.75c0-1.85-1.503-3.375-3.375-3.375h-3.375ZM12 12V8.25a3.375 3.375 0 0 1 3.375-3.375h.375a3.375 3.375 0 0 1 3.375 3.375v.375c0 .339-.04.672-.117.992M12 12v-1.5" /></svg>;
const ChartPieIcon = ({ className }: { className?: string }) => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}><path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6a7.5 7.5 0 1 0 7.5 7.5h-7.5V6Z" /><path strokeLinecap="round" strokeLinejoin="round" d="M13.5 10.5H21A7.5 7.5 0 0 0 13.5 3v7.5Z" /></svg>;
const CurrencyDollarIcon = ({ className }: { className?: string }) => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182.95-.756 2.108-1.14 3.282-1.14.904 0 1.696.26 2.447.724" /></svg>;
const SparklesIcon = ({ className }: { className?: string }) => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}><path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 0 0-2.456 2.456Z" /></svg>;
const TrophyIcon = ({ className }: { className?: string }) => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}><path strokeLinecap="round" strokeLinejoin="round" d="M16.5 18.75h-9a9.75 9.75 0 1 0 9 0Z" /><path strokeLinecap="round" strokeLinejoin="round" d="M12.375 9.75a3 3 0 1 1-4.75 2.548 3 3 0 0 1 4.75-2.548ZM15 9.75a3 3 0 1 1 3.75 3.75M4.5 6.75A2.25 2.25 0 0 1 6.75 4.5h10.5A2.25 2.25 0 0 1 19.5 6.75v3.75a2.25 2.25 0 0 1-2.25 2.25H6.75A2.25 2.25 0 0 1 4.5 10.5v-3.75Z" /></svg>;
const CheckCircleIcon = ({ className }: { className?: string }) => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" /></svg>;
const BellIcon = ({ className }: { className?: string }) => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}><path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0" /></svg>;
const ForwardIcon = ({ className }: { className?: string }) => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}><path strokeLinecap="round" strokeLinejoin="round" d="m5.25 4.5 7.5 7.5-7.5 7.5m6-15 7.5 7.5-7.5 7.5" /></svg>;
const ArchiveBoxIcon = ({ className }: { className?: string }) => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}><path strokeLinecap="round" strokeLinejoin="round" d="m20.25 7.5-.625 10.632a2.25 2.25 0 0 1-2.247 2.118H6.622a2.25 2.25 0 0 1-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125Z" /></svg>;
const DocumentTextIcon = ({ className }: { className?: string }) => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" /></svg>;
const StarIcon = ({ className }: { className?: string }) => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}><path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 0 1 1.04 0l2.125 5.111a.563.563 0 0 0 .475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 0 0-.182.557l1.285 5.385a.562.562 0 0 1-.84.61l-4.725-2.885a.562.562 0 0 0-.586 0L6.982 20.54a.562.562 0 0 1-.84-.61l1.285-5.386a.562.562 0 0 0-.182-.557l-4.204-3.602a.562.562 0 0 1 .321-.988l5.518-.442a.563.563 0 0 0 .475-.345L11.48 3.5Z" /></svg>;
const BanknotesIcon = ({ className }: { className?: string }) => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0 1 15.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 0 1 3 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 0 0-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 0 1-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 0 0 3 15h-.75M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm3 0h.008v.008H18V10.5Zm-12 0h.008v.008H6V10.5Z" /></svg>;
const PhotoIcon = ({ className }: { className?: string }) => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}><path strokeLinecap="round" strokeLinejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 0 0 1.5-1.5V6a1.5 1.5 0 0 0-1.5-1.5H3.75A1.5 1.5 0 0 0 2.25 6v12a1.5 1.5 0 0 0 1.5 1.5Zm10.5-11.25h.008v.008h-.008V8.25Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" /></svg>;
const LockClosedIcon = ({ className }: { className?: string }) => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}><path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 0 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" /></svg>;
const ArrowRightOnRectangleIcon = ({ className }: { className?: string }) => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6a2.25 2.25 0 0 0-2.25 2.25v13.5A2.25 2.25 0 0 0 7.5 21h6a2.25 2.25 0 0 0 2.25-2.25V15m3 0 3-3m0 0-3-3m3 3H9" /></svg>;
const EyeIcon = ({ className }: { className?: string }) => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}><path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" /></svg>;
const UserPlusIcon = ({ className }: { className?: string }) => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}><path strokeLinecap="round" strokeLinejoin="round" d="M19 7.5v3m0 0v3m0-3h3m-3 0h-3m-2.25-4.125a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0ZM3 19.235v-.11a6.375 6.375 0 0 1 12.75 0v.109A12.318 12.318 0 0 1 9.374 21c-2.331 0-4.512-.645-6.374-1.766Z" /></svg>;


// --- Helper Functions ---
const normalizeText = (text: string) => text.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");


// --- VIEW COMPONENTS ---

const getStatusClasses = (status: AppointmentStatus) => {
    switch (status) {
        case AppointmentStatus.Scheduled:
            return { shadow: 'shadow-[0_0_15px_rgba(59,130,246,0.5)]', border: 'border-blue-500', text: 'text-blue-400', label: 'Agendado' };
        case AppointmentStatus.InProgress:
            return { shadow: 'shadow-[0_0_15px_rgba(234,179,8,0.5)]', border: 'border-yellow-500', text: 'text-yellow-400', label: 'Em Andamento' };
        case AppointmentStatus.Finished:
            return { shadow: 'shadow-[0_0_15px_rgba(74,222,128,0.5)]', border: 'border-green-500', text: 'text-green-400', label: 'Finalizado' };
    }
};

type AppointmentCardProps = { appointment: Appointment; client?: Client; car?: Car; services: Service[]; onStart: (id: string) => void; onFinish: (id: string) => void; onEdit: (appointment: Appointment) => void; onDelete: (id: string) => void; };
const AppointmentCard: React.FC<AppointmentCardProps> = ({ appointment, client, car, services, onStart, onFinish, onEdit, onDelete }) => {
    if (!client || !car) return null;
    const statusStyle = getStatusClasses(appointment.status);
    const serviceNames = services.length > 0 ? services.map(s => s.name).join(' + ') : 'Serviço a definir no local';
    const totalDuration = services.reduce((acc, s) => acc + s.duration, 0);

    return (
        <div className={`bg-brand-gray-medium border-l-4 rounded-lg overflow-hidden transition-all duration-300 ${statusStyle.border} ${statusStyle.shadow}`}>
            <div className="p-4 space-y-3">
                <div className="flex justify-between items-start">
                    <span className={`font-bold text-lg ${statusStyle.text} pr-2`}>{serviceNames}</span>
                    <div className="flex items-center gap-2 flex-shrink-0">
                         <span className={`px-3 py-1 text-xs font-semibold rounded-full bg-black/40 ${statusStyle.text} border ${statusStyle.border}`}>{statusStyle.label}</span>
                         {appointment.status !== AppointmentStatus.Finished && (
                            <>
                                <button onClick={() => onEdit(appointment)} className="text-yellow-400 hover:text-yellow-300 p-1"><PencilSquareIcon className="w-5 h-5"/></button>
                                <button onClick={() => onDelete(appointment.id)} className="text-red-400 hover:text-red-300 p-1"><TrashIcon className="w-5 h-5"/></button>
                            </>
                        )}
                    </div>
                </div>
                <div className="border-t border-white/10 pt-3 space-y-2 text-gray-300">
                    <div className="flex items-center gap-3"><UserCircleIcon className="w-5 h-5 text-brand-red"/><span>{client.name}</span></div>
                    <div className="flex items-center gap-3"><CarIcon className="w-5 h-5 text-brand-red"/><span>{car.model} ({car.plate})</span></div>
                    <div className="flex items-center gap-3"><ClockIcon className="w-5 h-5 text-brand-red"/><span>{appointment.time} {totalDuration > 0 && `(${totalDuration} min)`}</span></div>
                     {appointment.isPlanService && <div className="flex items-center gap-3"><StarIcon className="w-5 h-5 text-yellow-400"/> <span className="text-yellow-300 text-sm font-medium">Serviço do Plano</span></div>}
                </div>
            </div>
            {appointment.status !== AppointmentStatus.Finished && (
                <div className="bg-black/30 p-2">
                    {appointment.status === AppointmentStatus.Scheduled && (
                        <button onClick={() => onStart(appointment.id)} className="w-full bg-yellow-600 hover:bg-yellow-500 text-white font-bold py-2 px-4 rounded-md transition-colors flex items-center justify-center gap-2">Iniciar Serviço</button>
                    )}
                    {appointment.status === AppointmentStatus.InProgress && (
                        <button onClick={() => onFinish(appointment.id)} className="w-full bg-green-600 hover:bg-green-500 text-white font-bold py-2 px-4 rounded-md transition-colors flex items-center justify-center gap-2">Finalizar e Notificar</button>
                    )}
                </div>
            )}
        </div>
    );
};

type AgendaSortBy = 'default' | 'recent' | 'time_asc' | 'time_desc';

// --- NEW COMPONENT: CustomSelect ---
type SelectOption = { value: string; label: string };
type CustomSelectProps = {
    options: SelectOption[];
    value: string;
    onChange: (value: string) => void;
};

const CustomSelect: React.FC<CustomSelectProps> = ({ options, value, onChange }) => {
    const [isOpen, setIsOpen] = useState(false);
    const selectRef = useRef<HTMLDivElement>(null);
    const selectedOption = options.find(opt => opt.value === value);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (selectRef.current && !selectRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleSelect = (optionValue: string) => {
        onChange(optionValue);
        setIsOpen(false);
    };

    return (
        <div className="relative" ref={selectRef}>
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className="w-full bg-brand-gray-dark border border-brand-gray-light text-white rounded-md p-2 flex justify-between items-center text-left focus:ring-2 focus:ring-brand-red focus:border-brand-red"
                aria-haspopup="listbox"
                aria-expanded={isOpen}
            >
                <span>{selectedOption?.label || 'Selecione...'}</span>
                <ChevronDownIcon className={`h-5 w-5 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
            </button>
            {isOpen && (
                <ul className="absolute z-10 mt-1 w-full bg-brand-gray-light border border-brand-gray-light rounded-md shadow-lg max-h-60 overflow-auto focus:outline-none" role="listbox">
                    {options.map(option => (
                        <li
                            key={option.value}
                            onClick={() => handleSelect(option.value)}
                            className={`cursor-pointer select-none relative py-2 pl-3 pr-9 text-white hover:bg-brand-red/20 ${value === option.value ? 'bg-brand-red/30' : ''}`}
                            role="option"
                            aria-selected={value === option.value}
                        >
                            <span className={`block truncate ${value === option.value ? 'font-semibold' : 'font-normal'}`}>{option.label}</span>
                             {value === option.value && (
                                <span className="absolute inset-y-0 right-0 flex items-center pr-2 text-brand-red">
                                    <CheckCircleIcon className="h-5 w-5" aria-hidden="true" />
                                </span>
                            )}
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
};


const AgendaView = ({ appointments, clients, services, onStartService, onFinishService, onEditAppointment, onDeleteAppointment }: { appointments: Appointment[]; clients: Client[]; services: Service[]; onStartService: (id: string) => void; onFinishService: (id: string) => void; onEditAppointment: (appointment: Appointment) => void; onDeleteAppointment: (id: string) => void; }) => {
    const [activeAgendaTab, setActiveAgendaTab] = useState<'today' | 'general' | 'history'>('today');
    const [sortBy, setSortBy] = useState<AgendaSortBy>('default');
    const getTodayDateString = () => new Date().toISOString().split('T')[0];
    const [historyFilterDate, setHistoryFilterDate] = useState(getTodayDateString());
    const [searchTerm, setSearchTerm] = useState('');

    const findById = <T extends { id: string }>(arr: T[], id: string) => arr.find(item => item.id === id);

    const sortedAndGroupedAppointments = useMemo(() => {
        const todayStr = getTodayDateString();
        let relevantAppointments: Appointment[];

        if (activeAgendaTab === 'today') {
            relevantAppointments = appointments.filter(app => app.date === todayStr);
        } else if (activeAgendaTab === 'general') {
            relevantAppointments = appointments.filter(app => app.date >= todayStr && app.status !== AppointmentStatus.Finished);
        } else { // history
            relevantAppointments = appointments.filter(app => app.status === AppointmentStatus.Finished && app.date === historyFilterDate);
        }
        
        let filteredAppointments = relevantAppointments;
        if (searchTerm && (activeAgendaTab === 'general' || activeAgendaTab === 'history')) {
            const normalizedSearch = normalizeText(searchTerm);
            filteredAppointments = relevantAppointments.filter(app => {
                const client = findById(clients, app.clientId);
                const clientMatch = client ? normalizeText(client.name).includes(normalizedSearch) : false;

                const servicesMatch = app.serviceIds.some(serviceId => {
                    const service = findById(services, serviceId);
                    return service ? normalizeText(service.name).includes(normalizedSearch) : false;
                });
                return clientMatch || servicesMatch;
            });
        }
        
        let sorted = [...filteredAppointments];
        
        if (activeAgendaTab === 'general') {
            switch(sortBy) {
                case 'recent':
                    sorted.sort((a, b) => `${b.date}T${b.time}`.localeCompare(`${a.date}T${a.time}`));
                    break;
                case 'time_asc':
                    sorted.sort((a, b) => a.time.localeCompare(b.time));
                    break;
                case 'time_desc':
                    sorted.sort((a, b) => b.time.localeCompare(a.time));
                    break;
                case 'default':
                default:
                    sorted.sort((a, b) => `${a.date}T${a.time}`.localeCompare(`${a.date}T${a.time}`));
                    break;
            }
        } else { // Today and History are sorted by time by default
             sorted.sort((a, b) => a.time.localeCompare(b.time));
        }

        return sorted.reduce((acc, app) => {
            const date = new Date(app.date + 'T00:00:00');
            const formattedDate = date.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' });
            const key = `${date.toISOString().split('T')[0]}|${formattedDate}`;
            if (!acc[key]) acc[key] = [];
            acc[key].push(app);
            return acc;
        }, {} as Record<string, Appointment[]>);
    }, [appointments, activeAgendaTab, sortBy, historyFilterDate, searchTerm, clients, services]);
    
    const dateKeys = Object.keys(sortedAndGroupedAppointments);

    return (
        <div className="p-4 space-y-4">
             <div className="flex border-b border-white/10 -mx-4 px-4">
                <button
                    onClick={() => setActiveAgendaTab('today')}
                    className={`px-4 py-2 text-sm font-semibold transition-colors w-1/3 ${activeAgendaTab === 'today' ? 'border-b-2 border-brand-red text-white' : 'text-gray-400 hover:text-white'}`}
                >
                    Hoje
                </button>
                <button
                    onClick={() => setActiveAgendaTab('general')}
                    className={`px-4 py-2 text-sm font-semibold transition-colors w-1/3 ${activeAgendaTab === 'general' ? 'border-b-2 border-brand-red text-white' : 'text-gray-400 hover:text-white'}`}
                >
                    Geral
                </button>
                 <button
                    onClick={() => setActiveAgendaTab('history')}
                    className={`px-4 py-2 text-sm font-semibold transition-colors w-1/3 ${activeAgendaTab === 'history' ? 'border-b-2 border-brand-red text-white' : 'text-gray-400 hover:text-white'}`}
                >
                    Histórico
                </button>
            </div>
            {(activeAgendaTab === 'general' || activeAgendaTab === 'history') && (
                <div className="my-2">
                    <FormInput 
                        label="Buscar Agendamento" 
                        placeholder="Digite o nome do cliente ou serviço..." 
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                    />
                </div>
            )}
             {activeAgendaTab === 'general' && (
                <div className="bg-brand-gray-medium p-3 rounded-md">
                    <label htmlFor="sort-order" className="block text-sm font-medium text-gray-300 mb-1">Ordenar por</label>
                    <CustomSelect
                        value={sortBy}
                        onChange={(value) => setSortBy(value as AgendaSortBy)}
                        options={[
                            { value: 'default', label: 'Padrão (Mais Antigo)' },
                            { value: 'recent', label: 'Mais Recente' },
                            { value: 'time_asc', label: 'Hora (Crescente)' },
                            { value: 'time_desc', label: 'Hora (Decrescente)' },
                        ]}
                    />
                </div>
            )}
             {activeAgendaTab === 'history' && (
                <div className="bg-brand-gray-medium p-3 rounded-md">
                    <label htmlFor="history-date-filter" className="block text-sm font-medium text-gray-300 mb-1">Ver serviços finalizados em:</label>
                    <input
                        id="history-date-filter"
                        type="date"
                        value={historyFilterDate}
                        onChange={e => setHistoryFilterDate(e.target.value)}
                        className="w-full bg-brand-gray-dark border border-brand-gray-light text-white rounded-md p-2 focus:ring-brand-red focus:border-brand-red"
                    />
                </div>
            )}
            {dateKeys.length === 0 && (
                <div className="text-center py-10">
                    <CalendarDaysIcon className="w-16 h-16 mx-auto text-gray-500 mb-4" />
                    <h3 className="text-xl font-bold text-white">Nenhum agendamento</h3>
                    <p className="text-gray-400 mt-2">
                         {searchTerm ? "Nenhum resultado para sua busca." : 
                           activeAgendaTab === 'today' ? "Não há agendamentos para hoje." :
                           activeAgendaTab === 'general' ? "Nenhum agendamento futuro encontrado." :
                           "Nenhum serviço finalizado na data selecionada."
                         }
                    </p>
                </div>
            )}
            {dateKeys.map(dateKey => {
                const [_, formattedDate] = dateKey.split('|');
                const apps = sortedAndGroupedAppointments[dateKey];
                return (
                    <div key={dateKey}>
                        <h2 className="text-brand-red font-bold text-xl mb-3 capitalize">{formattedDate}</h2>
                        <div className="space-y-4">
                            {apps.map(app => {
                                const appointmentServices = app.serviceIds
                                    .map(id => findById(services, id))
                                    .filter((s): s is Service => s !== undefined);

                                return (
                                    <AppointmentCard
                                        key={app.id}
                                        appointment={app}
                                        client={findById(clients, app.clientId)}
                                        car={findById(clients, app.clientId)?.cars.find(c => c.id === app.carId)}
                                        services={appointmentServices}
                                        onStart={onStartService}
                                        onFinish={onFinishService}
                                        onEdit={onEditAppointment}
                                        onDelete={onDeleteAppointment}
                                    />
                                );
                            })}
                        </div>
                    </div>
                )
            })}
        </div>
    );
};

type ClientCardProps = { client: Client; onEdit: (client: Client) => void; onDelete: (id: string) => void; plan: MonthlyPlan | undefined; usage: ClientPlanUsage | undefined; services: Service[] };
const ClientCard: React.FC<ClientCardProps> = ({ client, onEdit, onDelete, plan, usage, services }) => {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <div className="bg-brand-gray-medium rounded-lg overflow-hidden border border-white/10">
            <button onClick={() => setIsOpen(!isOpen)} className="w-full p-4 text-left flex justify-between items-center">
                <div className="flex items-center gap-3">
                    <div className="relative">
                        <UserCircleIcon className="w-8 h-8 text-brand-red" />
                        {plan && <div className="absolute -bottom-1 -right-1 bg-yellow-500 rounded-full p-0.5"><StarIcon className="w-3 h-3 text-white"/></div>}
                    </div>
                    <div>
                        <p className="font-bold text-white text-lg">{client.name}</p>
                        <p className="text-sm text-gray-400">{client.cpf}</p>
                        <p className="text-sm text-gray-400 flex items-center gap-1.5 mt-1"><PhoneIcon className="w-4 h-4"/>{client.whatsapp}</p>
                    </div>
                </div>
                <ChevronDownIcon className={`h-6 w-6 text-gray-300 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </button>
            {isOpen && (
                <div className="px-4 pb-4 bg-black/20 border-t border-white/10">
                    {plan && usage && (
                        <div className="mt-3 mb-2">
                             <h3 className="text-brand-red font-semibold mb-2">Plano Mensal: {plan.name}</h3>
                             <div className="bg-brand-gray-light p-3 rounded-md space-y-2">
                                {plan.includedServices.map(item => {
                                    const service = services.find(s => s.id === item.serviceId);
                                    if (!service) return null;
                                    const used = usage.usedServices[item.serviceId] || 0;
                                    return (
                                        <div key={item.serviceId} className="flex justify-between items-center text-sm">
                                            <span className="text-gray-300">{service.name}</span>
                                            <span className="font-semibold text-white">{used} / {item.quantity} usados</span>
                                        </div>
                                    )
                                })}
                             </div>
                        </div>
                    )}
                    <h3 className="text-brand-red font-semibold mt-3 mb-2">Veículos:</h3>
                    <div className="space-y-3">
                        {client.cars.map(car => (
                            <div key={car.id} className="bg-brand-gray-light p-3 rounded-md">
                                <p className="font-semibold text-white flex items-center gap-2"><CarIcon className="w-5 h-5"/>{car.model} - <span className="font-mono text-gray-300">{car.plate}</span></p>
                                <div className="mt-2 flex flex-wrap gap-2 items-center">
                                    <ShieldCheckIcon className="w-5 h-5 text-green-400" />
                                    {car.protections.map(p => <span key={p} className="text-green-300 text-xs font-medium">{p}</span>)}
                                </div>
                            </div>
                        ))}
                    </div>
                     <div className="flex justify-end gap-2 mt-4 border-t border-white/10 pt-3">
                        <button onClick={() => onEdit(client)} className="flex items-center gap-1 text-sm bg-yellow-600/20 text-yellow-400 px-3 py-1 rounded-md hover:bg-yellow-600/40 transition"><PencilSquareIcon className="w-4 h-4" /> Editar</button>
                        <button onClick={() => onDelete(client.id)} className="flex items-center gap-1 text-sm bg-red-600/20 text-red-400 px-3 py-1 rounded-md hover:bg-red-600/40 transition"><TrashIcon className="w-4 h-4" /> Excluir</button>
                    </div>
                </div>
            )}
        </div>
    );
};

const ClientsView = ({ clients, onAdd, onEdit, onDelete, monthlyPlans, clientPlanUsages, services }: { clients: Client[]; onAdd: () => void; onEdit: (client: Client) => void; onDelete: (id: string) => void; monthlyPlans: MonthlyPlan[]; clientPlanUsages: ClientPlanUsage[]; services: Service[]; }) => {
    const [searchTerm, setSearchTerm] = useState('');

    const filteredClients = useMemo(() => {
        if (!searchTerm) return clients;
        const normalizedSearch = normalizeText(searchTerm);
        return clients.filter(client => 
            normalizeText(client.name).includes(normalizedSearch) ||
            client.cpf.replace(/[.-]/g, '').includes(normalizedSearch)
        );
    }, [clients, searchTerm]);

    const getFirstDayOfCurrentMonth = () => {
        const now = new Date();
        return new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
    };
    
    return (
    <div className="p-4">
        <div className="mb-4">
             <button onClick={onAdd} className="w-full flex items-center justify-center gap-2 bg-brand-red hover:bg-red-700 text-white font-bold py-2 px-4 rounded-md transition-colors"><PlusIcon className="w-5 h-5" />Adicionar Cliente</button>
        </div>
        <div className="mb-4">
            <FormInput 
                label="Buscar Cliente" 
                placeholder="Digite o nome ou CPF..." 
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
            />
        </div>
        <div className="space-y-4">
            {filteredClients.length > 0 ? (
                filteredClients.map(client => {
                    const plan = monthlyPlans.find(p => p.id === client.monthlyPlanId);
                    const currentCycleStart = getFirstDayOfCurrentMonth();
                    const usage = clientPlanUsages.find(u => u.clientId === client.id && u.cycleStartDate === currentCycleStart);
                    return <ClientCard key={client.id} client={client} onEdit={onEdit} onDelete={onDelete} plan={plan} usage={usage} services={services} />
                })
            ) : (
                <div className="text-center py-10">
                    <UsersIcon className="w-16 h-16 mx-auto text-gray-500 mb-4" />
                    <h3 className="text-xl font-bold text-white">Nenhum cliente encontrado</h3>
                    <p className="text-gray-400 mt-2">Tente ajustar sua busca ou adicione um novo cliente.</p>
                </div>
            )}
        </div>
    </div>
)};

type ServiceCardProps = { 
    service: Service; 
    onEdit: (service: Service) => void;
    onDelete: (id: string) => void;
};
const ServiceCard: React.FC<ServiceCardProps> = ({ service, onEdit, onDelete }) => (
    <div className="bg-brand-gray-medium p-4 rounded-lg border border-white/10">
        <div className="flex justify-between items-start">
            <div className="flex-1">
                <h3 className="text-lg font-bold text-white pr-2">{service.name}</h3>
                <p className="text-gray-400 text-sm mt-1">{service.description}</p>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
                <button onClick={() => onEdit(service)} className="text-yellow-400 hover:text-yellow-300 p-1"><PencilSquareIcon className="w-5 h-5"/></button>
                <button onClick={() => onDelete(service.id)} className="text-red-400 hover:text-red-300 p-1"><TrashIcon className="w-5 h-5"/></button>
            </div>
        </div>
        <div className="flex items-center flex-wrap gap-x-4 gap-y-2 mt-3 pt-3 border-t border-white/10 text-gray-300">
            <span className="flex items-center gap-1.5"><ClockIcon className="w-4 h-4 text-brand-red"/> {service.duration} min</span>
            <span className="flex items-center gap-1.5"><CurrencyDollarIcon className="w-4 h-4 text-brand-red"/> R$ {service.price.toFixed(2)}</span>
            {service.maintenanceIntervalMonths && (
                <span className="flex items-center gap-1.5"><ArrowPathIcon className="w-4 h-4 text-brand-red"/> Manutenção: {service.maintenanceIntervalMonths} meses</span>
            )}
        </div>
    </div>
);

const ServicesView = ({ services, onAdd, onEdit, onDelete }: { services: Service[]; onAdd: () => void; onEdit: (service: Service) => void; onDelete: (id: string) => void; }) => (
    <div className="p-4">
        <div className="mb-4">
             <button onClick={onAdd} className="w-full flex items-center justify-center gap-2 bg-brand-red hover:bg-red-700 text-white font-bold py-2 px-4 rounded-md transition-colors"><PlusIcon className="w-5 h-5" />Adicionar Serviço</button>
        </div>
        <p className="text-center text-gray-400 text-sm mb-4">Serviços também podem ser adicionados via upload de catálogo na aba "Ajustes".</p>
        <div className="space-y-4">
            {services.length > 0 ? (
                services.map(service => (
                    <ServiceCard key={service.id} service={service} onEdit={onEdit} onDelete={onDelete} />
                ))
            ) : (
                <div className="text-center py-10">
                    <WrenchScrewdriverIcon className="w-16 h-16 mx-auto text-gray-500 mb-4" />
                    <h3 className="text-xl font-bold text-white">Nenhum serviço cadastrado</h3>
                    <p className="text-gray-400 mt-2">Adicione um novo serviço para começar a agendar.</p>
                </div>
            )}
        </div>
    </div>
);


type ChatMessageProps = { sender: 'user' | 'bot' | 'agent'; content: React.ReactNode; operatorName?: string; };
const ChatMessage: React.FC<ChatMessageProps> = ({ sender, content, operatorName }) => {
    const isUser = sender === 'user';
    
    return (
    <div className={`flex items-end gap-2 ${isUser ? 'justify-start' : 'justify-end'}`}>
        {sender === 'agent' && <div className="w-8 h-8 bg-blue-600 rounded-full flex-shrink-0 mb-8 flex items-center justify-center font-bold text-white">{operatorName?.charAt(0).toUpperCase()}</div>}
        {sender === 'bot' && <div className="w-8 h-8 bg-brand-red rounded-full flex-shrink-0 mb-8 flex items-center justify-center text-white font-bold text-lg">*</div>}
        
        <div className={`max-w-xs md:max-w-md p-3 rounded-2xl ${isUser ? 'bg-brand-gray-light text-gray-200 rounded-bl-none' : (sender === 'bot' ? 'bg-brand-red/80 text-white rounded-br-none' : 'bg-blue-700 text-white rounded-br-none')}`}>
            {content}
        </div>
    </div>
)};

const WhatsAppConnectionStatus = ({ status, message }: { status: 'connected' | 'disconnected' | 'loading', message: string }) => {
    const statusConfig = {
        connected: { text: message || 'Conectado', color: 'text-green-400', iconColor: 'text-green-500' },
        disconnected: { text: message || 'Desconectado', color: 'text-yellow-400', iconColor: 'text-yellow-500' },
        loading: { text: message || 'Aguardando Conexão', color: 'text-yellow-400', iconColor: 'text-yellow-500' }
    };
    const currentStatus = statusConfig[status];

    return (
        <div className="p-3 mb-4 rounded-lg flex items-center justify-between bg-black/30 border border-white/10">
            <div className="flex items-center gap-3">
                <SignalIcon className={`w-6 h-6 ${currentStatus.iconColor}`} />
                <div>
                    <p className="font-semibold text-white">Status da Conexão</p>
                    <p className={`text-sm ${currentStatus.color}`}>{currentStatus.text}</p>
                </div>
            </div>
        </div>
    );
};

// Interface for chat objects, now managed locally
interface WAChat {
    id: string;
    name: string;
    lastMessage: {
        body: string;
        timestamp: number;
    };
}
// Interface for message objects
interface WAMessage {
    id: { fromMe: boolean; remote: string; };
    body: string;
    timestamp: number;
    isBot?: boolean;
}


const WhatsAppView = ({ currentUser, status, qrCode, statusMessage, setStatus, setQrCode, setStatusMessage, addNotification, onDbChange }: { currentUser: User; status: 'connected' | 'disconnected' | 'loading'; qrCode: string | null; statusMessage: string; setStatus: (status: 'connected' | 'disconnected' | 'loading') => void; setQrCode: (qr: string | null) => void; setStatusMessage: (msg: string) => void; addNotification: (message: string) => void; onDbChange: () => void; }) => {
    const [chats, setChats] = useState<WAChat[]>([]);
    const [activeChatId, setActiveChatId] = useState<string | null>(null);
    const [messages, setMessages] = useState<WAMessage[]>([]);
    const [userInput, setUserInput] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const wasConnected = useRef(false);
    
    const activeChat = useMemo(() => chats.find(c => c.id === activeChatId), [chats, activeChatId]);

    useEffect(() => {
        const fetchInitialStatus = async () => {
            try {
                const response = await fetch('/api/whatsapp/status');
                if (response.ok) {
                    const data = await response.json();
                    setStatusMessage(data.message);
                    setQrCode(data.qrCode || null);
                    const newStatus = data.isConnected ? 'connected' : (data.qrCode ? 'loading' : 'disconnected');
                    setStatus(newStatus);
                    if (data.isConnected) {
                        wasConnected.current = true;
                    }
                }
            } catch (error) {
                console.error("Failed to fetch initial WA status:", error);
                setStatus('disconnected');
                setStatusMessage('Erro ao obter status do servidor.');
            }
        };
        fetchInitialStatus();
    }, [setStatus, setQrCode, setStatusMessage]);

    useEffect(() => {
        if (status === 'connected') {
            wasConnected.current = true;
        }
    }, [status]);
    
    // Long-polling for real-time events from the server
    useEffect(() => {
        if (!currentUser) return;

        let isPolling = true;

        const pollEvents = async () => {
            while (isPolling) {
                try {
                    const response = await fetch('/api/whatsapp/events');
                    if (response.status === 502) { // Timeout, normal for long-polling
                        continue;
                    }
                    if (response.ok) {
                        const event = await response.json();

                        if (event.type === 'status_change') {
                            const { isConnected, message, qrCode } = event.data;
                            setStatusMessage(message);
                            setQrCode(qrCode || null);
                            const newStatus = isConnected ? 'connected' : (qrCode ? 'loading' : 'disconnected');
                            setStatus(newStatus);
                        } else if (event.type === 'message') {
                            const newMessage: WAMessage = event.data;
                            const chatId = newMessage.id.remote;
                            
                            if (chatId === activeChatId) {
                                setMessages(prev => [...prev, newMessage]);
                            }

                            setChats(prevChats => {
                                const existingChatIndex = prevChats.findIndex(c => c.id === chatId);
                                const updatedChat: WAChat = {
                                    id: chatId,
                                    name: event.senderName || chatId.split('@')[0],
                                    lastMessage: {
                                        body: newMessage.body,
                                        timestamp: newMessage.timestamp,
                                    }
                                };
                                let newChats = [...prevChats];
                                if (existingChatIndex > -1) {
                                    newChats.splice(existingChatIndex, 1);
                                }
                                return [updatedChat, ...newChats];
                            });
                        } else if (event.type === 'db_change') {
                            addNotification("Novos dados do chatbot foram sincronizados.");
                            onDbChange();
                        }
                    } else {
                         await new Promise(resolve => setTimeout(resolve, 5000));
                    }
                } catch (error) {
                    console.error("Long-polling error:", error);
                    await new Promise(resolve => setTimeout(resolve, 5000));
                }
            }
        };

        pollEvents();

        return () => {
            isPolling = false;
        };
    }, [currentUser, activeChatId, setStatus, setQrCode, setStatusMessage, onDbChange, addNotification]);

    // Fetch initial chats when connection is established
    useEffect(() => {
        const fetchInitialChats = async () => {
            if (status === 'connected') {
                 try {
                     const response = await fetch('/api/whatsapp/chats');
                     if (response.ok) {
                         const data = await response.json();
                         setChats(data);
                         addNotification("Conversas do WhatsApp sincronizadas.");
                     }
                 } catch (error) {
                     console.error("Failed to fetch initial chats:", error);
                 }
            }
        };
        fetchInitialChats();
    }, [status, addNotification]);

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!userInput.trim() || !activeChatId) return;

        const messageContent = userInput;
        setUserInput('');
        
        const optimisticMessage: WAMessage = {
            id: { fromMe: true, remote: activeChatId },
            body: messageContent,
            timestamp: Date.now() / 1000,
            isBot: false,
        };
        setMessages(prev => [...prev, optimisticMessage]);

        try {
            const response = await fetch('/api/whatsapp/send-message', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ chatId: activeChatId, message: messageContent }),
            });
            if (!response.ok) {
                throw new Error('Failed to send message');
            }
             // Update chat list on send
            setChats(prevChats => {
                const chatIndex = prevChats.findIndex(c => c.id === activeChatId);
                if (chatIndex === -1) return prevChats;

                const chat = { ...prevChats[chatIndex] };
                chat.lastMessage = { body: messageContent, timestamp: Date.now() / 1000 };
                
                const newChats = [...prevChats];
                newChats.splice(chatIndex, 1);
                return [chat, ...newChats];
            });
        } catch (error) {
            console.error("Error sending message:", error);
            addNotification("Erro ao enviar mensagem.");
            // Revert optimistic update
            setMessages(prev => prev.filter(m => m !== optimisticMessage));
        }
    };
    
    useEffect(() => {
         const fetchMessages = async () => {
             if (activeChatId && status === 'connected') {
                 try {
                     const response = await fetch(`/api/whatsapp/messages/${activeChatId}`);
                     if (response.ok) {
                         const data = await response.json();
                         setMessages(data);
                     }
                 } catch (error) {
                     console.error("Failed to fetch messages:", error);
                     setMessages([]);
                 }
             } else {
                 setMessages([]);
             }
         };
         fetchMessages();
     }, [activeChatId, status]);

    const filteredChats = useMemo(() => {
        return chats.sort((a,b) => b.lastMessage.timestamp - a.lastMessage.timestamp)
                    .filter(chat => normalizeText(chat.name).includes(normalizeText(searchTerm)));
    }, [chats, searchTerm]);

    if (status === 'loading' || (status === 'disconnected' && !wasConnected.current)) {
         return (
             <div className="h-full flex flex-col">
                <div className="p-4"><WhatsAppConnectionStatus status={status} message={statusMessage} /></div>
                <div className="flex-grow flex flex-col items-center justify-center text-center p-4">
                    <h3 className="text-xl font-bold text-white mb-4">Conecte seu WhatsApp</h3>
                    <p className="text-gray-400 mt-2 max-w-md mb-6">Abra o WhatsApp no seu celular, vá para Aparelhos Conectados e escaneie o código abaixo.</p>
                    <div className="bg-white p-4 rounded-lg w-[282px] h-[282px] flex items-center justify-center">
                        {qrCode ? (
                            <img src={`data:image/png;base64,${qrCode}`} alt="WhatsApp QR Code" className="w-[250px] h-[250px]" />
                        ) : (
                            <div className="w-12 h-12 border-4 border-dashed border-gray-400 rounded-full animate-spin"></div>
                        )}
                    </div>
                </div>
             </div>
        );
    }
    
    if (status === 'disconnected' && wasConnected.current) {
        return (
             <div className="h-full flex flex-col">
                <div className="p-4"><WhatsAppConnectionStatus status={status} message={statusMessage} /></div>
                <div className="flex-grow flex flex-col items-center justify-center text-center p-4">
                     <ChatBubbleOvalLeftEllipsisIcon className="w-16 h-16 text-gray-500 mb-4"/>
                    <h3 className="text-xl font-bold text-white">WhatsApp Reconectando</h3>
                    <p className="text-gray-400 mt-2 max-w-md mb-6">A conexão foi perdida. Estamos tentando reconectar automaticamente. Isso pode levar alguns momentos.</p>
                     <ArrowPathIcon className="w-10 h-10 text-yellow-400 animate-spin" />
                </div>
            </div>
        );
    }
    
    return (
        <div className="h-full flex flex-col">
            <div className="p-4 pb-0"><WhatsAppConnectionStatus status={status} message={statusMessage} /></div>
            <div className="flex-grow flex overflow-hidden p-4 pt-0">
                {/* Sidebar com conversas */}
                <div className="w-1/3 max-w-sm bg-brand-gray-medium rounded-l-lg border-r border-white/10 flex flex-col">
                    <div className="p-2 border-b border-white/10">
                        <FormInput label="" placeholder="Buscar conversa..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                    </div>
                    <div className="overflow-y-auto flex-grow">
                        {filteredChats.map(chat => (
                             <div key={chat.id} onClick={() => setActiveChatId(chat.id)} className={`flex items-center gap-3 p-3 cursor-pointer border-l-4 transition-colors ${activeChatId === chat.id ? 'bg-brand-red/20 border-brand-red' : 'border-transparent hover:bg-white/5'}`}>
                                <UserCircleIcon className="w-10 h-10 text-gray-400 flex-shrink-0" />
                                <div className="flex-grow overflow-hidden">
                                    <div className="flex justify-between items-baseline">
                                        <p className="font-bold text-white truncate">{chat.name || chat.id.split('@')[0]}</p>
                                        <p className="text-xs text-gray-500 flex-shrink-0 ml-2">{new Date(chat.lastMessage.timestamp * 1000).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</p>
                                    </div>
                                    <p className="text-sm text-gray-400 truncate">{chat.lastMessage?.body || 'Sem mensagens'}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
                {/* Janela de Chat */}
                <div className="flex-1 flex flex-col bg-brand-gray-dark rounded-r-lg">
                    {activeChat ? (
                         <>
                            <div className="p-3 border-b border-white/10 flex items-center gap-3">
                                <UserCircleIcon className="w-10 h-10 text-gray-400" />
                                <p className="font-bold text-white">{activeChat.name}</p>
                            </div>
                            <div className="p-4 space-y-4 flex-grow overflow-y-auto">
                                {messages.map((msg, index) => (
                                    <ChatMessage 
                                        key={index} 
                                        sender={msg.id.fromMe ? (msg.isBot ? 'bot' : 'agent') : 'user'} 
                                        content={<p>{msg.body}</p>} 
                                        operatorName={currentUser.username}
                                    />
                                ))}
                            </div>
                            <div className="p-4 border-t border-white/10">
                                <form onSubmit={handleSendMessage} className="flex gap-2">
                                    <input type="text" value={userInput} onChange={e => setUserInput(e.target.value)} placeholder="Digite sua mensagem..." className="w-full bg-brand-gray-light border border-brand-gray-light text-white rounded-md p-2 focus:ring-brand-red focus:border-brand-red"/>
                                    <button type="submit" className="p-3 rounded-md text-white bg-brand-red hover:bg-red-700"><PaperAirplaneIcon className="w-5 h-5" /></button>
                                </form>
                            </div>
                        </>
                    ) : (
                         <div className="flex items-center justify-center h-full text-center text-gray-500">
                             <div>
                                 <ChatBubbleLeftRightIcon className="w-16 h-16 mx-auto mb-4"/>
                                <p className="text-lg">Selecione uma conversa</p>
                                <p>Escolha uma conversa na lista para começar a conversar.</p>
                            </div>
                         </div>
                    )}
                </div>
            </div>
        </div>
    );
};
// --- MODAL AND FORM COMPONENTS ---
type ModalProps = { isOpen: boolean; onClose: () => void; title: string; children: React.ReactNode; };
const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children }) => {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" onClick={onClose} aria-modal="true" role="dialog">
            <div className="bg-brand-gray-medium rounded-lg shadow-xl w-full max-w-md border border-brand-red-dark/50" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center p-4 border-b border-white/10">
                    <h3 className="text-xl font-bold text-white">{title}</h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-white" aria-label="Fechar modal"><XMarkIcon className="w-6 h-6" /></button>
                </div>
                <div className="p-4 max-h-[80vh] overflow-y-auto">{children}</div>
            </div>
        </div>
    );
};

const FormInput = ({ label, className, ...props }: { label: string, className?: string } & React.InputHTMLAttributes<HTMLInputElement>) => (
    <div>
        <label htmlFor={props.id || props.name} className={`block text-sm font-medium text-gray-300 mb-1 ${label ? '' : 'sr-only'}`}>{label}</label>
        <input {...props} className={`w-full bg-brand-gray-dark border border-brand-gray-light text-white rounded-md p-2 focus:ring-brand-red focus:border-brand-red ${className}`} />
    </div>
);

type AutomatedMessageModalProps = {
    isOpen: boolean;
    message: AutomatedMessage | null;
    onSave: (message: AutomatedMessage) => void;
    onClose: () => void;
};

const AutomatedMessageModal: React.FC<AutomatedMessageModalProps> = ({ isOpen, message, onSave, onClose }) => {
    const [formData, setFormData] = useState<Omit<AutomatedMessage, 'id'>>({
        name: '',
        enabled: true,
        trigger: 'before_appointment',
        value: 24,
        unit: 'hours',
        message: ''
    });

    useEffect(() => {
        if (message) {
            setFormData({
                name: message.name,
                enabled: message.enabled,
                trigger: message.trigger,
                value: message.value,
                unit: message.unit,
                message: message.message
            });
        } else {
            // Reset for new message
            setFormData({
                name: '',
                enabled: true,
                trigger: 'before_appointment',
                value: 24,
                unit: 'hours',
                message: ''
            });
        }
    }, [message]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value, type } = e.target;
        if (type === 'checkbox') {
            const checked = (e.target as HTMLInputElement).checked;
            setFormData(prev => ({ ...prev, [name]: checked }));
        } else {
            setFormData(prev => ({ ...prev, [name]: value }));
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const messageToSave = {
            ...formData,
            id: message?.id || `msg-${Date.now()}` // Use existing id or generate a new one
        };
        onSave(messageToSave);
    };
    
    const triggerLabels: Record<AutomatedMessage['trigger'], string> = {
         before_appointment: 'Antes do Agendamento',
         after_service_finished: 'Após Finalizar Serviço',
         service_maintenance_due: 'Lembrete de Manutenção de Serviço',
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={message ? 'Editar Mensagem' : 'Nova Mensagem Automática'}>
            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="flex items-center justify-between">
                    <label htmlFor="enabled" className="font-medium text-white">Ativada</label>
                    <input type="checkbox" id="enabled" name="enabled" checked={formData.enabled} onChange={handleChange} className="w-4 h-4 text-brand-red bg-gray-700 border-gray-600 rounded focus:ring-brand-red" />
                </div>
                <FormInput label="Nome da Mensagem" name="name" value={formData.name} onChange={handleChange} required />
                <div>
                    <label htmlFor="trigger" className="block text-sm font-medium text-gray-300 mb-1">Gatilho (Quando enviar)</label>
                    <select id="trigger" name="trigger" value={formData.trigger} onChange={handleChange} className="w-full bg-brand-gray-dark border border-brand-gray-light text-white rounded-md p-2 focus:ring-brand-red focus:border-brand-red">
                        {Object.entries(triggerLabels).map(([key, label]) => (
                            <option key={key} value={key}>{label}</option>
                        ))}
                    </select>
                </div>
                {formData.trigger !== 'service_maintenance_due' && (
                    <div className="flex gap-2 items-end">
                        <div className="flex-grow">
                            <FormInput label="Valor" type="number" name="value" value={formData.value} onChange={handleChange} required />
                        </div>
                        <div>
                            <label htmlFor="unit" className="block text-sm font-medium text-gray-300 mb-1">Unidade</label>
                            <select id="unit" name="unit" value={formData.unit} onChange={handleChange} className="w-full bg-brand-gray-dark border border-brand-gray-light text-white rounded-md p-2 focus:ring-brand-red focus:border-brand-red">
                                <option value="hours">Horas</option>
                                <option value="days">Dias</option>
                            </select>
                        </div>
                    </div>
                )}
                <div>
                    <label htmlFor="message" className="block text-sm font-medium text-gray-300 mb-1">Mensagem</label>
                    <textarea id="message" name="message" value={formData.message} onChange={handleChange} rows={4} className="w-full bg-brand-gray-dark border border-brand-gray-light text-white rounded-md p-2 focus:ring-brand-red focus:border-brand-red" required></textarea>
                    <p className="text-xs text-gray-400 mt-1">Use variáveis como `[CLIENTE]`, `[CARRO_MODELO]`, `[SERVICO]`, `[DATA]`.</p>
                </div>
                <div className="flex justify-end gap-2 pt-4 border-t border-white/10">
                    <button type="button" onClick={onClose} className="bg-gray-600 hover:bg-gray-500 text-white font-bold py-2 px-4 rounded-md">Cancelar</button>
                    <button type="submit" className="bg-brand-red hover:bg-red-700 text-white font-bold py-2 px-4 rounded-md">Salvar</button>
                </div>
            </form>
        </Modal>
    );
};

const SettingsView = ({
    currentUser,
    users,
    operatingHours,
    automatedMessages,
    monthlyPlans,
    services,
    onSave,
    onFileUpload,
    catalogFiles,
    isProcessingFile,
    onFileDelete,
    onUserSave,
    onUserDelete,
    onEditUser,
}: {
    currentUser: User;
    users: User[];
    operatingHours: OperatingHours;
    automatedMessages: AutomatedMessage[];
    monthlyPlans: MonthlyPlan[];
    services: Service[];
    onSave: (settings: { operatingHours: OperatingHours, automatedMessages: AutomatedMessage[], monthlyPlans: MonthlyPlan[], users: User[] }) => void;
    onFileUpload: (files: File[]) => void;
    catalogFiles: { id: string; file: File }[];
    isProcessingFile: boolean;
    onFileDelete: (fileId: string) => void;
    onUserSave: (user: User) => void;
    onUserDelete: (userId: string) => void;
    onEditUser: (user: User) => void;
}) => {
    const [localOperatingHours, setLocalOperatingHours] = useState<OperatingHours>(operatingHours);
    const [localMessages, setLocalMessages] = useState<AutomatedMessage[]>(automatedMessages);
    const [localPlans, setLocalPlans] = useState<MonthlyPlan[]>(monthlyPlans);
    const [localUsers, setLocalUsers] = useState<User[]>(users);
    const [newTime, setNewTime] = useState('');
    const [editingMessage, setEditingMessage] = useState<AutomatedMessage | 'new' | null>(null);
    const [editingPlan, setEditingPlan] = useState<MonthlyPlan | 'new' | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => setLocalUsers(users), [users]);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            onFileUpload(Array.from(e.target.files));
        }
    };

    const handleDayToggle = (dayIndex: number) => {
        const newDaysOpen = localOperatingHours.daysOpen.includes(dayIndex)
            ? localOperatingHours.daysOpen.filter(d => d !== dayIndex)
            : [...localOperatingHours.daysOpen, dayIndex];
        setLocalOperatingHours({ ...localOperatingHours, daysOpen: newDaysOpen });
    };

    const handleAddTime = () => {
        if (newTime.match(/^\d{2}:\d{2}$/) && !localOperatingHours.availableTimes.includes(newTime)) {
            const updatedTimes = [...localOperatingHours.availableTimes, newTime].sort();
            setLocalOperatingHours({ ...localOperatingHours, availableTimes: updatedTimes });
            setNewTime('');
        } else {
            alert('Formato de hora inválido (use HH:MM) ou horário já existente.');
        }
    };

    const handleRemoveTime = (timeToRemove: string) => {
        const updatedTimes = localOperatingHours.availableTimes.filter(t => t !== timeToRemove);
        setLocalOperatingHours({ ...localOperatingHours, availableTimes: updatedTimes });
    };

    const handleSaveMessage = (message: AutomatedMessage) => {
        const isNew = !localMessages.some(m => m.id === message.id);
        if (isNew) {
            setLocalMessages(prev => [...prev, { ...message, id: `msg-${Date.now()}` }]);
        } else {
            setLocalMessages(prev => prev.map(m => m.id === message.id ? message : m));
        }
        setEditingMessage(null);
    };

    const handleDeleteMessage = (id: string) => {
        if (window.confirm('Tem certeza que deseja excluir esta mensagem automática?')) {
            setLocalMessages(prev => prev.filter(m => m.id !== id));
        }
    };
    
     const handleSavePlan = (plan: MonthlyPlan) => {
        const isNew = !localPlans.some(p => p.id === plan.id);
        if (isNew) {
            setLocalPlans(prev => [...prev, { ...plan, id: `plan-${Date.now()}` }]);
        } else {
            setLocalPlans(prev => prev.map(p => p.id === plan.id ? plan : p));
        }
        setEditingPlan(null);
    };

    const handleDeletePlan = (id: string) => {
        if (window.confirm('Tem certeza que deseja excluir este plano? Clientes associados a ele perderão o vínculo.')) {
            setLocalPlans(prev => prev.filter(p => p.id !== id));
        }
    };

    const handleSaveChanges = () => {
        onSave({
            operatingHours: localOperatingHours,
            automatedMessages: localMessages,
            monthlyPlans: localPlans,
            users: localUsers,
        });
    };

    const weekdays = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];

    const triggerLabels: Record<AutomatedMessage['trigger'], string> = {
        before_appointment: 'Antes do Agendamento',
        after_service_finished: 'Após Finalizar Serviço',
        service_maintenance_due: 'Lembrete de Manutenção de Serviço',
    };

    return (
        <div className="p-4 space-y-6">
             {currentUser.role === 'owner' && (
                <div className="bg-brand-gray-medium p-4 rounded-lg border border-white/10">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-xl font-bold text-brand-red">Gerenciamento de Usuários</h3>
                        <button onClick={() => onEditUser({} as User)} className="flex items-center justify-center gap-1.5 bg-blue-600 hover:bg-blue-500 text-white font-bold py-2 px-3 rounded-md text-sm transition-colors"><UserPlusIcon className="w-4 h-4" /> Novo Usuário</button>
                    </div>
                    <div className="space-y-3">
                        {users.map(user => (
                            <div key={user.id} className="bg-brand-gray-light p-3 rounded-md flex justify-between items-center">
                                <div>
                                    <p className="font-semibold text-white">{user.username} <span className="text-xs bg-brand-red/50 text-red-300 px-2 py-0.5 rounded-full ml-2">{user.role}</span></p>
                                    <p className="text-sm text-gray-400">Acesso: {Object.entries(user.permissions).filter(([, allowed]) => allowed).map(([tabId]) => ALL_TABS.find(t=>t.id === tabId)?.label).join(', ')}</p>
                                </div>
                                <div className="flex gap-2">
                                    <button onClick={() => onEditUser(user)} className="text-yellow-400 hover:text-yellow-300 p-1"><PencilSquareIcon className="w-5 h-5"/></button>
                                    {user.role !== 'owner' && <button onClick={() => onUserDelete(user.id)} className="text-red-400 hover:text-red-300 p-1"><TrashIcon className="w-5 h-5"/></button>}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            <div className="bg-brand-gray-medium p-4 rounded-lg border border-white/10">
                <h3 className="text-xl font-bold text-brand-red mb-4">Dias de Funcionamento</h3>
                <div className="space-y-3">
                    {weekdays.map((day, index) => (
                        <div key={day} className="flex items-center justify-between bg-brand-gray-light p-3 rounded-md">
                            <span className="text-white font-medium">{day}</span>
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input type="checkbox" checked={localOperatingHours.daysOpen.includes(index)} onChange={() => handleDayToggle(index)} className="sr-only peer" />
                                <div className="w-11 h-6 bg-gray-600 rounded-full peer peer-focus:ring-2 peer-focus:ring-brand-red/50 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-brand-red"></div>
                            </label>
                        </div>
                    ))}
                </div>
            </div>

            <div className="bg-brand-gray-medium p-4 rounded-lg border border-white/10">
                <h3 className="text-xl font-bold text-brand-red mb-4">Horários de Atendimento</h3>
                <div className="flex gap-2 mb-4">
                    <input
                        type="time"
                        value={newTime}
                        onChange={(e) => setNewTime(e.target.value)}
                        className="w-full bg-brand-gray-dark border border-brand-gray-light text-white rounded-md p-2 focus:ring-brand-red focus:border-brand-red"
                        placeholder="HH:MM"
                    />
                    <button onClick={handleAddTime} className="bg-blue-600 hover:bg-blue-500 text-white font-bold px-4 rounded-md flex-shrink-0">Adicionar</button>
                </div>
                <div className="space-y-2">
                     {localOperatingHours.availableTimes.length > 0 ? localOperatingHours.availableTimes.map(time => (
                        <div key={time} className="flex items-center justify-between bg-brand-gray-light p-2 rounded-md">
                            <span className="font-mono text-white text-lg">{time}</span>
                            <button onClick={() => handleRemoveTime(time)} className="text-red-500 hover:text-red-400 p-1"><TrashIcon className="w-5 h-5"/></button>
                        </div>
                    )) : <p className="text-gray-400 text-center py-2">Nenhum horário cadastrado.</p>}
                </div>
            </div>
            
            <div className="bg-brand-gray-medium p-4 rounded-lg border border-white/10">
                <h3 className="text-xl font-bold text-brand-red mb-4">Configurações do Atendimento</h3>
                <div className="bg-brand-gray-light p-3 rounded-md">
                    <p className="text-white font-medium mb-2">Catálogo de Serviços (PDF ou JPG)</p>
                    <p className="text-sm text-gray-400 mb-3">Estes arquivos serão processados para atualizar sua lista de serviços. Todos os arquivos serão enviados para os clientes no chat.</p>
                    <input
                        type="file"
                        accept=".pdf,.jpg,.jpeg"
                        ref={fileInputRef}
                        onChange={handleFileChange}
                        className="hidden"
                        id="file-upload"
                        disabled={isProcessingFile}
                        multiple
                    />
                    <button onClick={() => fileInputRef.current?.click()} className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-bold py-2 px-4 rounded-md transition-colors disabled:bg-blue-800 disabled:cursor-wait" disabled={isProcessingFile}>
                         {isProcessingFile ? <> <ArrowPathIcon className="w-5 h-5 animate-spin" /> Processando...</> : <><ArchiveBoxIcon className="w-5 h-5"/>Fazer Upload do Catálogo</>}
                    </button>
                    {catalogFiles.length > 0 && (
                        <div className="mt-4 pt-3 border-t border-white/20">
                            <p className="text-sm font-semibold text-gray-300 mb-2">Arquivos Carregados:</p>
                            <div className="space-y-2">
                                {catalogFiles.map(({ id, file }) => (
                                    <div key={id} className="flex items-center justify-between bg-brand-gray-dark p-2 rounded-md">
                                        <div className="flex items-center gap-2 overflow-hidden">
                                            {file.type.includes('pdf') ? <DocumentTextIcon className="w-5 h-5 text-brand-red flex-shrink-0"/> : <PhotoIcon className="w-5 h-5 text-brand-red flex-shrink-0"/>}
                                            <span className="text-sm text-white truncate">{file.name}</span>
                                        </div>
                                        <button onClick={() => onFileDelete(id)} className="text-red-400 hover:text-red-300 p-1 flex-shrink-0" disabled={isProcessingFile}>
                                            <TrashIcon className="w-5 h-5"/>
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>
            
            <div className="bg-brand-gray-medium p-4 rounded-lg border border-white/10">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-xl font-bold text-brand-red">Planos Mensais</h3>
                    <button onClick={() => setEditingPlan('new')} className="flex items-center justify-center gap-1.5 bg-blue-600 hover:bg-blue-500 text-white font-bold py-2 px-3 rounded-md text-sm transition-colors"><PlusIcon className="w-4 h-4" /> Novo Plano</button>
                </div>
                 <div className="space-y-3">
                     {localPlans.map(plan => (
                         <div key={plan.id} className="bg-brand-gray-light p-3 rounded-md flex justify-between items-center">
                             <div>
                                 <p className="font-semibold text-white">{plan.name}</p>
                                 <p className="text-sm text-green-400 font-bold">R$ {plan.price.toFixed(2)}/mês</p>
                             </div>
                             <div className="flex gap-2">
                                 <button onClick={() => setEditingPlan(plan)} className="text-yellow-400 hover:text-yellow-300 p-1"><PencilSquareIcon className="w-5 h-5"/></button>
                                 <button onClick={() => handleDeletePlan(plan.id)} className="text-red-400 hover:text-red-300 p-1"><TrashIcon className="w-5 h-5"/></button>
                             </div>
                         </div>
                     ))}
                     {localPlans.length === 0 && <p className="text-gray-400 text-center py-4">Nenhum plano mensal configurado.</p>}
                 </div>
            </div>

            <div className="bg-brand-gray-medium p-4 rounded-lg border border-white/10">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-xl font-bold text-brand-red">Mensagens Automáticas</h3>
                    <button onClick={() => setEditingMessage('new')} className="flex items-center justify-center gap-1.5 bg-blue-600 hover:bg-blue-500 text-white font-bold py-2 px-3 rounded-md text-sm transition-colors"><PlusIcon className="w-4 h-4" /> Nova Mensagem</button>
                </div>
                <div className="space-y-3">
                    {localMessages.map(msg => (
                        <div key={msg.id} className="bg-brand-gray-light p-3 rounded-md flex justify-between items-center">
                            <div>
                                <p className={`font-semibold ${msg.enabled ? 'text-white' : 'text-gray-500 line-through'}`}>{msg.name}</p>
                                <p className="text-sm text-gray-400">{triggerLabels[msg.trigger]}: <span className="font-semibold">{msg.trigger !== 'service_maintenance_due' ? `${msg.value} ${msg.unit === 'hours' ? 'horas' : 'dias'}` : 'Automático'}</span></p>
                            </div>
                            <div className="flex gap-2">
                                <button onClick={() => setEditingMessage(msg)} className="text-yellow-400 hover:text-yellow-300 p-1"><PencilSquareIcon className="w-5 h-5"/></button>
                                <button onClick={() => handleDeleteMessage(msg.id)} className="text-red-400 hover:text-red-300 p-1"><TrashIcon className="w-5 h-5"/></button>
                            </div>
                        </div>
                    ))}
                    {localMessages.length === 0 && <p className="text-gray-400 text-center py-4">Nenhuma mensagem automática configurada.</p>}
                </div>
            </div>

            <button onClick={handleSaveChanges} className="w-full bg-brand-red hover:bg-red-700 text-white font-bold py-3 px-4 rounded-md transition-colors text-lg">Salvar Todas as Configurações</button>
        
            <AutomatedMessageModal 
                isOpen={editingMessage !== null}
                message={editingMessage === 'new' ? null : editingMessage}
                onSave={handleSaveMessage}
                onClose={() => setEditingMessage(null)}
            />
            
             <MonthlyPlanModal 
                isOpen={editingPlan !== null}
                plan={editingPlan === 'new' ? null : editingPlan}
                services={services}
                onSave={handleSavePlan}
                onClose={() => setEditingPlan(null)}
            />
        </div>
    );
};

// ... (Other components like BarChart, DashboardView, etc. remain mostly the same)
const BarChart = ({ data, labels }: { data: number[]; labels: string[] }) => {
    const maxValue = Math.max(...data, 1); // Avoid division by zero
    return (
        <div className="flex justify-around items-end h-64 bg-brand-gray-light p-4 rounded-md gap-2">
            {data.map((value, index) => (
                <div key={index} className="flex flex-col items-center flex-1" title={`R$ ${value.toFixed(2)}`}>
                    <div
                        className="w-full bg-brand-red hover:bg-red-700 transition-all duration-300 rounded-t-md"
                        style={{ height: `${(value / maxValue) * 100}%` }}
                    ></div>
                    <span className="text-xs text-gray-400 mt-2">{labels[index]}</span>
                </div>
            ))}
        </div>
    );
};

const DashboardView = ({ appointments, clients, services, monthlyPlans }: { appointments: Appointment[]; clients: Client[]; services: Service[]; monthlyPlans: MonthlyPlan[]; }) => {
    const getFirstDayOfMonth = () => {
        const now = new Date();
        return new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
    };
    const getToday = () => new Date().toISOString().split('T')[0];

    const [startDateInput, setStartDateInput] = useState(getFirstDayOfMonth());
    const [endDateInput, setEndDateInput] = useState(getToday());
    const [activeStartDate, setActiveStartDate] = useState(getFirstDayOfMonth());
    const [activeEndDate, setActiveEndDate] = useState(getToday());

    const MetricCard = ({ icon, title, children, className = '' }: { icon: React.ReactNode, title: string, children?: React.ReactNode, className?: string }) => (
        <div className={`bg-brand-gray-medium p-4 rounded-lg border border-white/10 flex flex-col ${className}`}>
            <div className="flex items-center gap-3 mb-4">
                <div className="bg-brand-red/20 p-2 rounded-full">{icon}</div>
                <h3 className="text-lg font-semibold text-white">{title}</h3>
            </div>
            <div className="flex-grow">{children}</div>
        </div>
    );
    
    const filteredFinishedAppointments = useMemo(() => {
        return appointments.filter(a => {
            return a.status === AppointmentStatus.Finished && a.date >= activeStartDate && a.date <= activeEndDate;
        });
    }, [appointments, activeStartDate, activeEndDate]);

    // --- METRICS ---
    const getRevenue = useCallback((apps: Appointment[]) => apps
        .flatMap(a => a.serviceIds.map(serviceId => services.find(s => s.id === serviceId)?.price || 0))
        .reduce((sum, price) => sum + price, 0), [services]);

    const dailyRevenue = useMemo(() => {
        const todayStr = getToday();
        const todaysAppointments = appointments.filter(a => a.status === AppointmentStatus.Finished && a.date === todayStr);
        return getRevenue(todaysAppointments);
    }, [appointments, getRevenue]);

    const revenueForPeriod = getRevenue(filteredFinishedAppointments);

    const topClients = useMemo(() => {
        const now = new Date();
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();

        const appointmentsThisMonth = appointments.filter(a => {
            const appDate = new Date(a.date + 'T00:00:00');
            return appDate.getMonth() === currentMonth && appDate.getFullYear() === currentYear;
        });

        const clientCounts = appointmentsThisMonth.reduce((acc, app) => {
            acc[app.clientId] = (acc[app.clientId] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);

        return Object.entries(clientCounts)
            .map(([clientId, count]) => ({
                client: clients.find(c => c.id === clientId),
                count,
            }))
            .filter(item => item.client)
            .sort((a, b) => b.count - a.count)
            .slice(0, 3);
    }, [appointments, clients]);
    
    // Faturamento Mensal (last 6 months - independent of filter)
    const monthlyRevenueData = useMemo(() => {
        const labels: string[] = [];
        const data: number[] = [];
        const now = new Date();
        const allFinished = appointments.filter(a => a.status === AppointmentStatus.Finished);
        
        for (let i = 5; i >= 0; i--) {
            const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const monthName = date.toLocaleString('pt-BR', { month: 'short' }).replace('.', '').toLocaleUpperCase();
            labels.push(monthName);
            
            const monthRevenue = getRevenue(allFinished.filter(a => {
                const appDate = new Date(a.date + 'T00:00:00');
                return appDate.getMonth() === date.getMonth() && appDate.getFullYear() === date.getFullYear();
            }));
            data.push(monthRevenue);
        }
        return { labels, data };
    }, [appointments, getRevenue]);

    // Serviços Mais/Menos Vendidos (based on filter)
    const serviceCounts = filteredFinishedAppointments
        .flatMap(a => a.serviceIds)
        .reduce((acc, id) => {
            acc[id] = (acc[id] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);

    const sortedServices = Object.entries(serviceCounts)
        .map(([id, count]) => ({ service: services.find(s => s.id === id), count }))
        .filter(item => item.service)
        .sort((a, b) => b.count - a.count);
        
    const mostSoldServices = sortedServices.slice(0, 3);
    const leastSoldServices = sortedServices.length > 3 ? sortedServices.slice(-3).reverse() : [];

    // Formas de Pagamento (based on filter)
    const paymentMethodCounts = filteredFinishedAppointments
        .reduce((acc, app) => {
            if (app.paymentMethod) {
                acc[app.paymentMethod] = (acc[app.paymentMethod] || 0) + 1;
            }
            return acc;
        }, {} as Record<string, number>);
    
    const formatDate = (dateStr: string) => dateStr.split('-').reverse().join('/');

    return (
        <div className="p-4 space-y-4">
             <div className="bg-brand-gray-medium p-4 rounded-lg border border-white/10">
                <label className="block text-sm font-medium text-gray-300 mb-2">Filtrar por Período</label>
                <div className="flex flex-col md:flex-row gap-2">
                    <input
                        type="date"
                        value={startDateInput}
                        onChange={e => setStartDateInput(e.target.value)}
                        className="w-full bg-brand-gray-dark border border-brand-gray-light text-white rounded-md p-2 focus:ring-brand-red focus:border-brand-red"
                    />
                     <input
                        type="date"
                        value={endDateInput}
                        onChange={e => setEndDateInput(e.target.value)}
                        className="w-full bg-brand-gray-dark border border-brand-gray-light text-white rounded-md p-2 focus:ring-brand-red focus:border-brand-red"
                    />
                    <button 
                        onClick={() => { setActiveStartDate(startDateInput); setActiveEndDate(endDateInput); }} 
                        className="bg-brand-red hover:bg-red-700 text-white font-bold px-4 rounded-md"
                    >
                        Filtrar
                    </button>
                </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <MetricCard icon={<CurrencyDollarIcon className="w-8 h-8 text-brand-red"/>} title="Faturamento do Dia">
                    <p className="text-4xl font-bold text-white">R$ {dailyRevenue.toFixed(2)}</p>
                    <p className="text-sm text-gray-400">Receita de serviços finalizados hoje</p>
                </MetricCard>

                <MetricCard icon={<CurrencyDollarIcon className="w-8 h-8 text-brand-red"/>} title="Faturamento Bruto">
                    <p className="text-4xl font-bold text-white">R$ {revenueForPeriod.toFixed(2)}</p>
                    <p className="text-sm text-gray-400">De {formatDate(activeStartDate)} até {formatDate(activeEndDate)}</p>
                </MetricCard>

                <MetricCard icon={<TrophyIcon className="w-8 h-8 text-yellow-400"/>} title="Top Clientes (Mês)">
                    {topClients.length > 0 ? (
                        <ul className="space-y-2">
                            {topClients.map(({ client, count }) => (
                                <li key={client!.id} className="flex justify-between items-center bg-brand-gray-light p-2 rounded-md">
                                    <span className="text-white font-medium truncate pr-2">{client!.name}</span>
                                    <span className="text-yellow-400 font-bold text-lg flex-shrink-0">{count}</span>
                                </li>
                            ))}
                        </ul>
                    ) : <p className="text-gray-400 text-center py-2">Nenhum agendamento este mês.</p>}
                </MetricCard>
            </div>

            <div className="bg-brand-gray-medium p-4 rounded-lg border border-white/10">
                <h3 className="text-lg font-semibold text-white mb-4">Faturamento Mensal (Últimos 6 Meses)</h3>
                <BarChart labels={monthlyRevenueData.labels} data={monthlyRevenueData.data} />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <MetricCard icon={<SparklesIcon className="w-6 h-6 text-brand-red"/>} title="Serviços Mais Vendidos (Período)">
                    {mostSoldServices.length > 0 ? (
                        <ul className="space-y-2">
                            {mostSoldServices.map(({ service, count }) => (
                                <li key={service!.id} className="flex justify-between items-center bg-brand-gray-light p-2 rounded-md">
                                    <span className="text-white font-medium truncate pr-2">{service!.name}</span>
                                    <span className="text-brand-red font-bold text-lg flex-shrink-0">{count}x</span>
                                </li>
                            ))}
                        </ul>
                    ) : <p className="text-gray-400 text-center py-2">Nenhum serviço finalizado no período.</p>}
                </MetricCard>

                <MetricCard icon={<ArchiveBoxIcon className="w-6 h-6 text-brand-red"/>} title="Serviços Menos Vendidos (Período)">
                     {leastSoldServices.length > 0 ? (
                        <ul className="space-y-2">
                            {leastSoldServices.map(({ service, count }) => (
                                <li key={service!.id} className="flex justify-between items-center bg-brand-gray-light p-2 rounded-md">
                                    <span className="text-white font-medium truncate pr-2">{service!.name}</span>
                                    <span className="text-brand-red font-bold text-lg flex-shrink-0">{count}x</span>
                                </li>
                            ))}
                        </ul>
                    ) : <p className="text-gray-400 text-center py-2">Dados insuficientes.</p>}
                </MetricCard>

                <MetricCard icon={<ChartPieIcon className="w-6 h-6 text-brand-red"/>} title="Formas de Pagamento (Período)">
                     {Object.keys(paymentMethodCounts).length > 0 ? (
                        <ul className="space-y-2">
                            {Object.entries(paymentMethodCounts).sort((a, b) => b[1] - a[1]).map(([method, count]) => (
                                <li key={method} className="flex justify-between items-center bg-brand-gray-light p-2 rounded-md">
                                    <span className="text-white font-medium">{method}</span>
                                    <span className="text-brand-red font-bold text-lg">{count}</span>
                                </li>
                            ))}
                        </ul>
                    ) : <p className="text-gray-400 text-center py-2">Nenhum pagamento registrado no período.</p>}
                </MetricCard>
            </div>
        </div>
    );
};

const ClientForm = ({ client, onSave, onCancel, monthlyPlans }: { client: Client | null; onSave: (client: Omit<Client, 'id'> & { id?: string }) => void; onCancel: () => void; monthlyPlans: MonthlyPlan[] }) => {
    const [formData, setFormData] = useState({ id: client?.id || '', name: client?.name || '', cpf: client?.cpf || '', whatsapp: client?.whatsapp || '', cars: client?.cars || [], monthlyPlanId: client?.monthlyPlanId || '' });
    const [newCar, setNewCar] = useState({ model: '', plate: '', protections: '' });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
    const handleNewCarChange = (e: React.ChangeEvent<HTMLInputElement>) => setNewCar(prev => ({ ...prev, [e.target.name]: e.target.value }));

    const handleAddCar = () => {
        if (!newCar.model || !newCar.plate) {
            alert('Modelo e placa são obrigatórios para adicionar um novo veículo.');
            return;
        }
        const newVehicle: Car = { id: `car${Date.now()}`, model: newCar.model, plate: newCar.plate, protections: newCar.protections.split(',').map(p => p.trim()).filter(p => p) };
        setFormData(prev => ({ ...prev, cars: [...prev.cars, newVehicle] }));
        setNewCar({ model: '', plate: '', protections: '' });
    };
    
    const handleDeleteCar = (carId: string) => setFormData(prev => ({ ...prev, cars: prev.cars.filter(car => car.id !== carId) }));

    const handleSubmit = (e: React.FormEvent) => { e.preventDefault(); onSave(formData); };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <FormInput label="Nome Completo" name="name" value={formData.name} onChange={handleChange} required />
            <FormInput label="CPF" name="cpf" value={formData.cpf} onChange={handleChange} required />
            <FormInput label="WhatsApp (com DDD)" name="whatsapp" value={formData.whatsapp} onChange={handleChange} required />
            
             <div>
                <label htmlFor="monthlyPlanId" className="block text-sm font-medium text-gray-300 mb-1">Plano Mensal</label>
                <select id="monthlyPlanId" name="monthlyPlanId" value={formData.monthlyPlanId} onChange={handleChange} className="w-full bg-brand-gray-dark border border-brand-gray-light text-white rounded-md p-2 focus:ring-brand-red focus:border-brand-red">
                    <option value="">Nenhum Plano</option>
                    {monthlyPlans.map(plan => <option key={plan.id} value={plan.id}>{plan.name}</option>)}
                </select>
            </div>
            
            <div className="pt-4 border-t border-white/20 mt-4">
                <h4 className="text-lg font-semibold text-brand-red mb-3">Veículos</h4>
                <div className="space-y-2 mb-4">
                    {formData.cars.map(car => (
                        <div key={car.id} className="bg-brand-gray-dark p-2 rounded-md flex justify-between items-center">
                            <div>
                                <p className="font-semibold text-white">{car.model} ({car.plate})</p>
                                <p className="text-xs text-gray-400">{car.protections.join(', ')}</p>
                            </div>
                            <button type="button" onClick={() => handleDeleteCar(car.id)} className="text-red-400 hover:text-red-300"><TrashIcon className="w-4 h-4"/></button>
                        </div>
                    ))}
                </div>
                <div className="bg-brand-gray-dark/50 p-3 rounded-md space-y-2 border border-dashed border-white/20">
                    <h5 className="font-semibold text-white">Adicionar Novo Veículo</h5>
                    <FormInput label="Modelo" name="model" value={newCar.model} onChange={handleNewCarChange} placeholder="Ex: Honda Civic" />
                    <FormInput label="Placa" name="plate" value={newCar.plate} onChange={handleNewCarChange} placeholder="ABC-1234" />
                    <FormInput label="Proteções (separado por vírgula)" name="protections" value={newCar.protections} onChange={handleNewCarChange} placeholder="PPF, Vitrificação 5 anos" />
                    <button type="button" onClick={handleAddCar} className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-2 px-3 rounded-md mt-2">Adicionar Veículo</button>
                </div>
            </div>
            <div className="flex justify-end gap-2 pt-4 border-t border-white/10 mt-4">
                <button type="button" onClick={onCancel} className="bg-gray-600 hover:bg-gray-500 text-white font-bold py-2 px-4 rounded-md">Cancelar</button>
                <button type="submit" className="bg-brand-red hover:bg-red-700 text-white font-bold py-2 px-4 rounded-md">Salvar Cliente</button>
            </div>
        </form>
    );
};

const AppointmentForm = ({ appointment, clients, services, monthlyPlans, clientPlanUsages, onSave, onCancel }: { appointment: Appointment | null; clients: Client[]; services: Service[]; monthlyPlans: MonthlyPlan[]; clientPlanUsages: ClientPlanUsage[]; onSave: (appointment: Omit<Appointment, 'id'> & { id?: string }) => void; onCancel: () => void; }) => {
    const [formData, setFormData] = useState({
        id: appointment?.id || '',
        clientId: appointment?.clientId || '',
        carId: appointment?.carId || '',
        serviceIds: appointment?.serviceIds || [],
        date: appointment?.date || new Date().toISOString().split('T')[0],
        time: appointment?.time || '09:00',
        status: appointment?.status || AppointmentStatus.Scheduled,
        isPlanService: appointment?.isPlanService || false,
        paymentMethod: appointment?.paymentMethod || '',
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };
    
    const handleServiceChange = (serviceId: string) => {
        setFormData(prev => {
            const newServiceIds = prev.serviceIds.includes(serviceId)
                ? prev.serviceIds.filter(id => id !== serviceId)
                : [...prev.serviceIds, serviceId];
            return { ...prev, serviceIds: newServiceIds };
        });
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const client = clients.find(c => c.id === formData.clientId);
        const plan = monthlyPlans.find(p => p.id === client?.monthlyPlanId);
        const isAnyServiceInPlan = formData.serviceIds.some(sid => plan?.includedServices.some(is => is.serviceId === sid));
        
        const dataToSave: Omit<Appointment, 'id'> & { id?: string } = {
            ...formData,
            isPlanService: isAnyServiceInPlan,
            paymentMethod: formData.paymentMethod ? (formData.paymentMethod as Appointment['paymentMethod']) : undefined,
        };
        
        onSave(dataToSave);
    };

    const selectedClient = clients.find(c => c.id === formData.clientId);
    const clientPlan = monthlyPlans.find(p => p.id === selectedClient?.monthlyPlanId);
    
    const getFirstDayOfCurrentMonth = () => {
        const now = new Date();
        return new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
    };
    const currentCycleStart = getFirstDayOfCurrentMonth();
    const clientUsage = clientPlanUsages.find(u => u.clientId === selectedClient?.id && u.cycleStartDate === currentCycleStart);


    return (
        <form onSubmit={handleSubmit} className="space-y-4">
             <div>
                 <label htmlFor="clientId" className="block text-sm font-medium text-gray-300 mb-1">Cliente</label>
                 <select id="clientId" name="clientId" value={formData.clientId} onChange={handleChange} required className="w-full bg-brand-gray-dark border border-brand-gray-light text-white rounded-md p-2 focus:ring-brand-red focus:border-brand-red">
                     <option value="">Selecione um cliente</option>
                     {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                 </select>
             </div>
             {selectedClient && (
                 <div>
                     <label htmlFor="carId" className="block text-sm font-medium text-gray-300 mb-1">Veículo</label>
                     <select id="carId" name="carId" value={formData.carId} onChange={handleChange} required className="w-full bg-brand-gray-dark border border-brand-gray-light text-white rounded-md p-2 focus:ring-brand-red focus:border-brand-red">
                         <option value="">Selecione um veículo</option>
                         {selectedClient.cars.map(car => <option key={car.id} value={car.id}>{car.model} ({car.plate})</option>)}
                     </select>
                 </div>
             )}
             <div>
                 <label className="block text-sm font-medium text-gray-300 mb-1">Serviços</label>
                 <div className="space-y-2 max-h-40 overflow-y-auto bg-brand-gray-dark p-2 rounded-md border border-brand-gray-light">
                     {services.map(service => {
                         const planServiceInfo = clientPlan?.includedServices.find(is => is.serviceId === service.id);
                         const usedCount = clientUsage?.usedServices[service.id] || 0;
                         const isIncluded = planServiceInfo && usedCount < planServiceInfo.quantity;
                         
                         return (
                             <div key={service.id} className="flex items-center justify-between">
                                 <div className="flex items-center">
                                     <input id={`service-${service.id}`} type="checkbox" checked={formData.serviceIds.includes(service.id)} onChange={() => handleServiceChange(service.id)} className="h-4 w-4 rounded border-gray-600 bg-gray-700 text-brand-red focus:ring-brand-red"/>
                                     <label htmlFor={`service-${service.id}`} className="ml-2 text-sm text-gray-300">{service.name}</label>
                                 </div>
                                 {isIncluded && (
                                     <span className="text-xs font-semibold bg-yellow-600/30 text-yellow-300 px-2 py-0.5 rounded-full">Incluso no Plano</span>
                                 )}
                             </div>
                         )
                     })}
                 </div>
             </div>
             <FormInput label="Data" name="date" type="date" value={formData.date} onChange={handleChange} required />
             <FormInput label="Horário" name="time" type="time" value={formData.time} onChange={handleChange} required />
             <div>
                <label htmlFor="paymentMethod" className="block text-sm font-medium text-gray-300 mb-1">Forma de Pagamento</label>
                <select id="paymentMethod" name="paymentMethod" value={formData.paymentMethod} onChange={handleChange} className="w-full bg-brand-gray-dark border border-brand-gray-light text-white rounded-md p-2 focus:ring-brand-red focus:border-brand-red">
                    <option value="">Não definido</option>
                    <option value="PIX">PIX</option>
                    <option value="Cartão de Crédito">Cartão de Crédito</option>
                    <option value="Cartão de Débito">Cartão de Débito</option>
                    <option value="Dinheiro">Dinheiro</option>
                </select>
            </div>
             
             <div className="flex justify-end gap-2 pt-4 border-t border-white/10 mt-4">
                 <button type="button" onClick={onCancel} className="bg-gray-600 hover:bg-gray-500 text-white font-bold py-2 px-4 rounded-md">Cancelar</button>
                 <button type="submit" className="bg-brand-red hover:bg-red-700 text-white font-bold py-2 px-4 rounded-md">Salvar Agendamento</button>
             </div>
        </form>
    );
};

const MonthlyPlanModal = ({ isOpen, plan, services, onSave, onClose }: { isOpen: boolean; plan: MonthlyPlan | null; services: Service[]; onSave: (plan: MonthlyPlan) => void; onClose: () => void; }) => {
    const [formData, setFormData] = useState<Omit<MonthlyPlan, 'id'>>({ name: '', price: 0, includedServices: [] });

    useEffect(() => {
        if (plan) {
            setFormData({ name: plan.name, price: plan.price, includedServices: plan.includedServices });
        } else {
            setFormData({ name: '', price: 0, includedServices: [] });
        }
    }, [plan]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: name === 'price' ? parseFloat(value) || 0 : value }));
    };

    const handleServiceInclusionChange = (serviceId: string, quantity: number) => {
        setFormData(prev => {
            const existing = prev.includedServices.find(s => s.serviceId === serviceId);
            if (existing) {
                return { ...prev, includedServices: quantity > 0 ? prev.includedServices.map(s => s.serviceId === serviceId ? { ...s, quantity } : s) : prev.includedServices.filter(s => s.serviceId !== serviceId) };
            } else if (quantity > 0) {
                return { ...prev, includedServices: [...prev.includedServices, { serviceId, quantity }] };
            }
            return prev;
        });
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave({ ...formData, id: plan?.id || '' });
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={plan ? 'Editar Plano Mensal' : 'Novo Plano Mensal'}>
            <form onSubmit={handleSubmit} className="space-y-4">
                <FormInput label="Nome do Plano" name="name" value={formData.name} onChange={handleChange} required />
                <FormInput label="Preço Mensal (R$)" name="price" type="number" value={formData.price} onChange={handleChange} required />
                <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">Serviços Inclusos</label>
                    <div className="space-y-2 max-h-48 overflow-y-auto bg-brand-gray-dark p-2 rounded-md border border-brand-gray-light">
                        {services.map(service => (
                            <div key={service.id} className="flex items-center justify-between">
                                <span className="text-gray-300">{service.name}</span>
                                <input
                                    type="number"
                                    min="0"
                                    value={formData.includedServices.find(s => s.serviceId === service.id)?.quantity || 0}
                                    onChange={e => handleServiceInclusionChange(service.id, parseInt(e.target.value, 10) || 0)}
                                    className="w-16 bg-brand-gray-light text-white rounded-md p-1 text-center"
                                />
                            </div>
                        ))}
                    </div>
                </div>
                <div className="flex justify-end gap-2 pt-4 border-t border-white/10 mt-4">
                    <button type="button" onClick={onClose} className="bg-gray-600 hover:bg-gray-500 text-white font-bold py-2 px-4 rounded-md">Cancelar</button>
                    <button type="submit" className="bg-brand-red hover:bg-red-700 text-white font-bold py-2 px-4 rounded-md">Salvar Plano</button>
                </div>
            </form>
        </Modal>
    );
};

const ServiceForm = ({ service, onSave, onCancel }: { service: Service | null; onSave: (service: Omit<Service, 'id'> & { id?: string }) => void; onCancel: () => void; }) => {
    const [formData, setFormData] = useState({
        id: service?.id || '',
        name: service?.name || '',
        description: service?.description || '',
        duration: service?.duration || 0,
        price: service?.price || 0,
        maintenanceIntervalMonths: service?.maintenanceIntervalMonths || undefined,
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value, type } = e.target;
        setFormData(prev => ({ ...prev, [name]: type === 'number' ? parseFloat(value) || 0 : value }));
    };
    
    const handleMaintenanceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        setFormData(prev => ({...prev, maintenanceIntervalMonths: value === '' ? undefined : parseInt(value, 10) || 0 }));
    }

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave(formData);
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <FormInput label="Nome do Serviço" name="name" value={formData.name} onChange={handleChange} required />
            <FormInput label="Descrição" name="description" value={formData.description} onChange={handleChange} required />
            <FormInput label="Duração (minutos)" name="duration" type="number" value={formData.duration} onChange={handleChange} required />
            <FormInput label="Preço (R$)" name="price" type="number" step="0.01" value={formData.price} onChange={handleChange} required />
            <FormInput label="Intervalo de Manutenção (meses)" name="maintenanceIntervalMonths" type="number" value={formData.maintenanceIntervalMonths ?? ''} onChange={handleMaintenanceChange} placeholder="Opcional" />
            
            <div className="flex justify-end gap-2 pt-4 border-t border-white/10 mt-4">
                <button type="button" onClick={onCancel} className="bg-gray-600 hover:bg-gray-500 text-white font-bold py-2 px-4 rounded-md">Cancelar</button>
                <button type="submit" className="bg-brand-red hover:bg-red-700 text-white font-bold py-2 px-4 rounded-md">Salvar Serviço</button>
            </div>
        </form>
    );
};

type LoginViewProps = {
    onLogin: (username: string, password: string) => void;
    error: string;
};

const LoginView: React.FC<LoginViewProps> = ({ onLogin, error }) => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onLogin(username, password);
    };

    return (
        <div className="bg-brand-gray-dark min-h-screen flex items-center justify-center p-4">
            <div className="w-full max-w-sm">
                <div className="flex justify-center mb-6">
                    <img src="https://i.ibb.co/RFS2dzp/367528167-710099640950435-2122611024923455495-n.jpg" alt="CAR CLASS Logo" className="h-20 w-20 rounded-full" />
                </div>
                 <h1 className="text-3xl font-bold text-center text-white tracking-wider mb-2">CAR<span className="text-brand-red">CLASS</span></h1>
                 <p className="text-center text-gray-400 mb-8">Acesso ao Painel Administrativo</p>
                <form onSubmit={handleSubmit} className="bg-brand-gray-medium shadow-lg rounded-lg px-8 pt-6 pb-8 mb-4 border border-white/10">
                    <div className="mb-4 relative">
                        <UserCircleIcon className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        <FormInput 
                            label="" 
                            id="username"
                            name="username"
                            type="text"
                            value={username}
                            onChange={e => setUsername(e.target.value)}
                            placeholder="Usuário"
                            className="pl-10"
                            required 
                        />
                    </div>
                    <div className="mb-6 relative">
                         <LockClosedIcon className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        <FormInput 
                            label="" 
                            id="password"
                            name="password"
                            type="password"
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                            placeholder="Senha"
                            className="pl-10"
                        />
                    </div>
                    {error && <p className="text-red-500 text-xs italic mb-4 text-center">{error}</p>}
                    <div className="flex items-center justify-between">
                        <button 
                            className="w-full bg-brand-red hover:bg-red-700 text-white font-bold py-2 px-4 rounded-md focus:outline-none focus:shadow-outline transition-colors" 
                            type="submit"
                        >
                            Entrar
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

// ... Notification Panel Component
const NotificationPanel = ({ notifications, onClear, onMarkAsRead }: { notifications: NotificationItem[], onClear: (id: string) => void, onMarkAsRead: (id: string) => void }) => {
    return (
        <div className="absolute top-14 right-4 w-80 bg-brand-gray-medium rounded-lg shadow-lg border border-white/10 z-50">
            <div className="p-3 border-b border-white/10">
                <h4 className="font-bold text-white">Notificações</h4>
            </div>
            <div className="max-h-96 overflow-y-auto">
                {notifications.length > 0 ? notifications.map(n => (
                    <div key={n.id} onClick={() => onMarkAsRead(n.id)} className={`p-3 border-b border-white/10 text-sm cursor-pointer hover:bg-brand-gray-light ${!n.read ? 'bg-brand-red/10' : ''}`}>
                        <p className={`text-gray-200 ${!n.read ? 'font-semibold' : ''}`}>{n.message}</p>
                        <p className="text-xs text-gray-500 mt-1">{new Date(n.timestamp).toLocaleString('pt-BR')}</p>
                    </div>
                )) : <p className="text-gray-400 text-center p-4">Nenhuma notificação.</p>}
            </div>
        </div>
    );
};

// ... User Form Modal Component
const UserForm = ({ user, onSave, onCancel }: { user: User | null; onSave: (user: Omit<User, 'id'> & { id?: string }) => void; onCancel: () => void; }) => {
    const [formData, setFormData] = useState<Omit<User, 'id'>>({ username: '', password: '', role: 'employee', permissions: {} });

    useEffect(() => {
        if (user) {
            setFormData({
                username: user.username || '',
                password: '', // Always clear password for security
                role: user.role || 'employee',
                permissions: user.permissions || {}
            });
        }
    }, [user]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => setFormData(p => ({ ...p, [e.target.name]: e.target.value }));
    const handlePermissionChange = (tabId: string, isAllowed: boolean) => {
        setFormData(p => ({ ...p, permissions: { ...p.permissions, [tabId]: isAllowed } }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave({ ...formData, id: user?.id });
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <FormInput label="Nome de Usuário" name="username" value={formData.username} onChange={handleChange} required />
            <FormInput label="Senha" name="password" type="password" value={formData.password} onChange={handleChange} placeholder={user?.id ? "Deixe em branco para não alterar" : ""} required={!user?.id} />
            <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Permissões de Acesso</label>
                <div className="space-y-2 bg-brand-gray-dark p-3 rounded-md border border-brand-gray-light">
                    {ALL_TABS.map(tab => (
                        <div key={tab.id} className="flex items-center">
                            <input
                                id={`perm-${tab.id}`}
                                type="checkbox"
                                checked={!!formData.permissions[tab.id]}
                                onChange={(e) => handlePermissionChange(tab.id, e.target.checked)}
                                className="h-4 w-4 rounded border-gray-600 bg-gray-700 text-brand-red focus:ring-brand-red"
                            />
                            <label htmlFor={`perm-${tab.id}`} className="ml-2 text-sm text-gray-300">{tab.label}</label>
                        </div>
                    ))}
                </div>
            </div>
            <div className="flex justify-end gap-2 pt-4 border-t border-white/10 mt-4">
                <button type="button" onClick={onCancel} className="bg-gray-600 hover:bg-gray-500 text-white font-bold py-2 px-4 rounded-md">Cancelar</button>
                <button type="submit" className="bg-brand-red hover:bg-red-700 text-white font-bold py-2 px-4 rounded-md">Salvar Usuário</button>
            </div>
        </form>
    );
};


const App = () => {
    const [clients, setClients] = useState<Client[]>(MOCK_CLIENTS);
    const [services, setServices] = useState<Service[]>(MOCK_SERVICES);
    const [appointments, setAppointments] = useState<Appointment[]>(MOCK_APPOINTMENTS);
    const [monthlyPlans, setMonthlyPlans] = useState<MonthlyPlan[]>(MOCK_PLANS);
    const [clientPlanUsages, setClientPlanUsages] = useState<ClientPlanUsage[]>(MOCK_CLIENT_PLAN_USAGE);
    const [notifications, setNotifications] = useState<NotificationItem[]>([]);
    const [conversationLogs, setConversationLogs] = useState<ConversationLog[]>([]);
    const [isProcessingFile, setIsProcessingFile] = useState(false);
    
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [loginError, setLoginError] = useState('');
    const [users, setUsers] = useState<User[]>([]);

    const [operatingHours, setOperatingHours] = useState<OperatingHours>({
         daysOpen: [1, 2, 3, 4, 5, 6], // Mon-Sat
         availableTimes: ['09:00', '10:00', '11:00', '14:00', '15:00', '16:00', '17:00'],
    });
    const [automatedMessages, setAutomatedMessages] = useState<AutomatedMessage[]>([]);

    const [activeTab, setActiveTab] = useState('dashboard');
    const [editingClient, setEditingClient] = useState<Client | null>(null);
    const [isClientModalOpen, setIsClientModalOpen] = useState(false);
    const [editingAppointment, setEditingAppointment] = useState<Appointment | null>(null);
    const [isAppointmentModalOpen, setIsAppointmentModalOpen] = useState(false);
    const [editingService, setEditingService] = useState<Service | null>(null);
    const [isServiceModalOpen, setIsServiceModalOpen] = useState(false);
    const [editingUser, setEditingUser] = useState<User | null>(null);
    const [isUserModalOpen, setIsUserModalOpen] = useState(false);
    
    const [catalogFiles, setCatalogFiles] = useState<{ id: string; file: File }[]>([]);
    const [isNotificationPanelOpen, setIsNotificationPanelOpen] = useState(false);
    const [whatsAppStatus, setWhatsAppStatus] = useState<'connected' | 'disconnected' | 'loading'>('loading');
    const [qrCode, setQrCode] = useState<string | null>(null);
    const [statusMessage, setStatusMessage] = useState('Inicializando...');

    const addNotification = useCallback((message: string) => {
         const newNotif: NotificationItem = { id: `notif-${Date.now()}`, message, timestamp: new Date(), read: false };
         setNotifications(prev => [newNotif, ...prev.slice(0, 49)]);
    }, []);
    
    const saveData = useCallback(async (dataToSave: { [key: string]: any }) => {
        try {
            const response = await fetch('/api/data', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(dataToSave),
            });
            if (!response.ok) {
                throw new Error(`Server responded with ${response.status}`);
            }
        } catch (error) {
            console.error("Failed to save data:", error);
            addNotification("Erro: Falha ao salvar os dados no servidor.");
        }
    }, [addNotification]);

    const loadData = useCallback(async () => {
        try {
            const response = await fetch('/api/data');
            if (!response.ok) {
                throw new Error(`Server responded with ${response.status}`);
            }
            const data = await response.json();
            setClients(data.clients || []);
            setServices(data.services || []);
            setAppointments(data.appointments || []);
            setMonthlyPlans(data.monthlyPlans || []);
            setClientPlanUsages(data.clientPlanUsages || []);
            setConversationLogs(data.conversationLogs || []);
            setUsers(data.users || []);
             if (data.operatingHours) setOperatingHours(data.operatingHours);
            if (data.automatedMessages) setAutomatedMessages(data.automatedMessages);
        } catch (error) {
            console.error("Failed to load data from server:", error);
            addNotification("Erro: Não foi possível carregar os dados do servidor.");
        }
    }, [addNotification]);
    
    useEffect(() => {
        loadData();
    }, [loadData]);


    const handleClientSave = useCallback((clientData: Omit<Client, 'id'> & { id?: string }) => {
        let newClients;
         if (clientData.id) {
             newClients = clients.map(c => c.id === clientData.id ? { ...c, ...clientData } as Client : c);
             addNotification(`Cliente "${clientData.name}" atualizado.`);
         } else {
             const newClient = { ...clientData, id: `c${Date.now()}`, cars: clientData.cars || [] } as Client;
             newClients = [...clients, newClient];
             addNotification(`Novo cliente "${clientData.name}" adicionado.`);
         }
         setClients(newClients);
         saveData({ clients: newClients });
         setIsClientModalOpen(false);
    }, [addNotification, clients, saveData]);

    const handleClientDelete = useCallback((id: string) => {
         if (window.confirm('Tem certeza?')) {
             const newClients = clients.filter(c => c.id !== id);
             setClients(newClients);
             saveData({ clients: newClients });
         }
    }, [clients, saveData]);
    
    const handleAppointmentSave = useCallback((appointmentData: Omit<Appointment, 'id'> & { id?: string }) => {
        let newAppointments;
        if (appointmentData.id) {
             newAppointments = appointments.map(a => a.id === appointmentData.id ? { ...a, ...appointmentData } as Appointment : a);
             addNotification(`Agendamento atualizado.`);
        } else {
            const newAppointment: Appointment = { ...appointmentData, id: `a${Date.now()}`};
            newAppointments = [...appointments, newAppointment];
            addNotification(`Novo agendamento criado para ${clients.find(c=>c.id === newAppointment.clientId)?.name}.`);
        }
        setAppointments(newAppointments);
        saveData({ appointments: newAppointments });
        setIsAppointmentModalOpen(false);
    }, [addNotification, clients, appointments, saveData]);
    
    const handleAppointmentDelete = useCallback((id: string) => {
         if (window.confirm('Tem certeza?')) {
             const newAppointments = appointments.filter(a => a.id !== id);
             setAppointments(newAppointments);
             saveData({ appointments: newAppointments });
         }
    }, [appointments, saveData]);

    const handleServiceSave = useCallback((serviceData: Omit<Service, 'id'> & { id?: string }) => {
        let newServices;
        if (serviceData.id) {
            newServices = services.map(s => s.id === serviceData.id ? { ...s, ...serviceData } as Service : s);
        } else {
            newServices = [...services, { ...serviceData, id: `s${Date.now()}` } as Service];
        }
        setServices(newServices);
        saveData({ services: newServices });
        setIsServiceModalOpen(false);
    }, [services, saveData]);

    const handleServiceDelete = useCallback((id: string) => {
        if (window.confirm('Tem certeza?')) {
            const newServices = services.filter(s => s.id !== id);
            setServices(newServices);
            saveData({ services: newServices });
        }
    }, [services, saveData]);

    const handleFileUpload = useCallback(async (files: File[]) => {
        setIsProcessingFile(true);
        // ... (implementation is the same)
        setIsProcessingFile(false);
    }, []);

    const handleFileDelete = useCallback((fileIdToDelete: string) => {
        if (window.confirm('Tem certeza?')) {
            setCatalogFiles(prev => prev.filter(f => f.id !== fileIdToDelete));
            setServices(prev => prev.filter(s => s.sourceFileId !== fileIdToDelete));
        }
    }, []);

    const handleStartService = useCallback((id: string) => {
        const newAppointments = appointments.map(app => app.id === id ? { ...app, status: AppointmentStatus.InProgress } : app);
        setAppointments(newAppointments);
        saveData({ appointments: newAppointments });
    }, [appointments, saveData]);

    const handleFinishService = useCallback((id: string) => {
        const newAppointments = appointments.map(app => app.id === id ? { ...app, status: AppointmentStatus.Finished } : app);
        setAppointments(newAppointments);
        saveData({ appointments: newAppointments });
    }, [appointments, saveData]);
    
    const handleSaveSettings = useCallback((settings: { operatingHours: OperatingHours, automatedMessages: AutomatedMessage[], monthlyPlans: MonthlyPlan[], users: User[] }) => {
         setOperatingHours(settings.operatingHours);
         setAutomatedMessages(settings.automatedMessages);
         setMonthlyPlans(settings.monthlyPlans);
         setUsers(settings.users);
         saveData(settings);
         addNotification("Configurações salvas com sucesso!");
     }, [addNotification, saveData]);
    
    const handleNewConversation = useCallback((log: ConversationLog) => setConversationLogs(prev => [log, ...prev.slice(0, 49)]), []);
    
    const handleLogin = useCallback((username: string, passwordAttempt: string) => {
        const user = users.find(u => u.username.toLowerCase() === username.toLowerCase());
        if (user && user.password === passwordAttempt) {
            setCurrentUser(user);
            setLoginError('');
        } else {
            setLoginError('Usuário ou senha inválidos.');
        }
    }, [users]);

    const handleLogout = useCallback(() => setCurrentUser(null), []);
    
    const handleUserSave = useCallback((userData: Omit<User, 'id'> & { id?: string }) => {
        let newUsers;
        if (userData.id) {
            newUsers = users.map(u => u.id === userData.id ? { ...u, ...userData, password: userData.password || u.password } as User : u);
        } else {
            newUsers = [...users, { ...userData, id: `user-${Date.now()}`, role: 'employee' } as User];
        }
        setUsers(newUsers);
        saveData({ users: newUsers });
        setIsUserModalOpen(false);
    }, [users, saveData]);

    const handleUserDelete = useCallback((userId: string) => {
        if (window.confirm("Tem certeza que deseja excluir este usuário?")) {
            const newUsers = users.filter(u => u.id !== userId);
            setUsers(newUsers);
            saveData({ users: newUsers });
        }
    }, [users, saveData]);

    const TABS = [
        { id: 'dashboard', icon: <ChartPieIcon className="w-6 h-6" />, label: "Dashboard" },
        { id: 'agenda', icon: <CalendarDaysIcon className="w-6 h-6" />, label: "Agenda" },
        { id: 'clients', icon: <UsersIcon className="w-6 h-6" />, label: "Clientes" },
        { id: 'services', icon: <WrenchScrewdriverIcon className="w-6 h-6" />, label: "Serviços" },
        { id: 'whatsapp', icon: <ChatBubbleLeftRightIcon className="w-6 h-6" />, label: "WhatsApp" },
        { id: 'settings', icon: <Cog6ToothIcon className="w-6 h-6" />, label: "Ajustes" },
    ];
    const visibleTabs = useMemo(() => {
        if (!currentUser) return [];
        return TABS.filter(tab => currentUser.permissions[tab.id]);
    }, [currentUser]);

    const renderContent = () => {
        if (!currentUser || !currentUser.permissions[activeTab]) {
            return <div className="p-4 text-center text-red-400">Acesso negado.</div>
        }
        switch (activeTab) {
            case 'agenda': return <AgendaView appointments={appointments} clients={clients} services={services} onStartService={handleStartService} onFinishService={handleFinishService} onEditAppointment={(app) => {setEditingAppointment(app); setIsAppointmentModalOpen(true); }} onDeleteAppointment={handleAppointmentDelete} />;
            case 'clients': return <ClientsView clients={clients} onAdd={() => {setEditingClient(null); setIsClientModalOpen(true); }} onEdit={(client) => { setEditingClient(client); setIsClientModalOpen(true); }} onDelete={handleClientDelete} monthlyPlans={monthlyPlans} clientPlanUsages={clientPlanUsages} services={services}/>;
            case 'services': return <ServicesView services={services} onAdd={() => { setEditingService(null); setIsServiceModalOpen(true); }} onEdit={(service) => { setEditingService(service); setIsServiceModalOpen(true); }} onDelete={handleServiceDelete} />;
            case 'whatsapp': return <WhatsAppView currentUser={currentUser} status={whatsAppStatus} qrCode={qrCode} statusMessage={statusMessage} setStatus={setWhatsAppStatus} setQrCode={setQrCode} setStatusMessage={setStatusMessage} addNotification={addNotification} onDbChange={loadData} />;
            case 'dashboard': return <DashboardView appointments={appointments} clients={clients} services={services} monthlyPlans={monthlyPlans} />;
            case 'settings': return <SettingsView currentUser={currentUser} users={users} operatingHours={operatingHours} automatedMessages={automatedMessages} monthlyPlans={monthlyPlans} services={services} onSave={handleSaveSettings} onFileUpload={handleFileUpload} catalogFiles={catalogFiles} isProcessingFile={isProcessingFile} onFileDelete={handleFileDelete} onUserSave={handleUserSave} onUserDelete={handleUserDelete} onEditUser={(user) => {setEditingUser(user); setIsUserModalOpen(true);}} />;
            default: return <DashboardView appointments={appointments} clients={clients} services={services} monthlyPlans={monthlyPlans} />;
        }
    };

    if (!currentUser) {
        return <LoginView onLogin={handleLogin} error={loginError} />;
    }

    return (
        <div className="bg-brand-gray-dark min-h-screen text-gray-200 font-sans flex flex-col md:flex-row">
             <main className="flex-1 flex flex-col h-screen">
                 <header className="bg-brand-gray-medium p-3 flex justify-between items-center border-b border-white/10">
                      <div className="flex items-center gap-3">
                         <img src="https://i.ibb.co/RFS2dzp/367528167-710099640950435-2122611024923455495-n.jpg" alt="CAR CLASS Logo" className="h-10 w-10 rounded-full" />
                         <h1 className="text-xl font-bold text-white tracking-wider">CAR<span className="text-brand-red">CLASS</span></h1>
                     </div>
                      <div className="flex items-center gap-4">
                        <span className="text-sm text-gray-300">Olá, <span className="font-bold text-white">{currentUser.username}</span></span>
                         <div className="relative">
                            <button onClick={() => setIsNotificationPanelOpen(p => !p)}>
                                <BellIcon className="w-6 h-6 text-gray-300 hover:text-white" />
                                {notifications.filter(n => !n.read).length > 0 && <span className="absolute -top-1 -right-1 flex h-4 w-4"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span><span className="relative inline-flex rounded-full h-4 w-4 bg-red-500 text-white text-xs items-center justify-center">{notifications.filter(n => !n.read).length}</span></span>}
                            </button>
                            {isNotificationPanelOpen && <NotificationPanel notifications={notifications} onClear={(id) => setNotifications(p => p.filter(n => n.id !== id))} onMarkAsRead={(id) => setNotifications(p => p.map(n => n.id === id ? {...n, read: true} : n))} />}
                         </div>
                         <button onClick={handleLogout} className="text-gray-300 hover:text-white" title="Sair">
                            <ArrowRightOnRectangleIcon className="w-6 h-6" />
                         </button>
                      </div>
                 </header>
                 
                 <div className="flex-1 overflow-y-auto pb-16">
                      {renderContent()}
                 </div>

                  <div className="fixed bottom-0 left-0 right-0 md:relative bg-brand-gray-medium border-t border-white/10 flex justify-around">
                     {visibleTabs.map(tab => (
                        <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`flex flex-col items-center justify-center space-y-1 w-full py-2 text-xs font-medium transition-colors ${activeTab === tab.id ? 'text-brand-red border-b-2 border-brand-red' : 'text-gray-400 hover:text-white'}`}>
                            {tab.icon}
                            <span>{tab.label}</span>
                        </button>
                     ))}
                 </div>
             </main>
             
             <Modal isOpen={isClientModalOpen} onClose={() => setIsClientModalOpen(false)} title={editingClient ? 'Editar Cliente' : 'Novo Cliente'}>
                 <ClientForm client={editingClient} onSave={handleClientSave} onCancel={() => setIsClientModalOpen(false)} monthlyPlans={monthlyPlans} />
             </Modal>
             <Modal isOpen={isAppointmentModalOpen} onClose={() => setIsAppointmentModalOpen(false)} title={editingAppointment ? 'Editar Agendamento' : 'Novo Agendamento'}>
                 <AppointmentForm appointment={editingAppointment} clients={clients} services={services} monthlyPlans={monthlyPlans} clientPlanUsages={clientPlanUsages} onSave={handleAppointmentSave} onCancel={() => setIsAppointmentModalOpen(false)} />
             </Modal>
             <Modal isOpen={isServiceModalOpen} onClose={() => setIsServiceModalOpen(false)} title={editingService ? 'Editar Serviço' : 'Novo Serviço'}>
                <ServiceForm service={editingService} onSave={handleServiceSave} onCancel={() => setIsServiceModalOpen(false)} />
            </Modal>
            <Modal isOpen={isUserModalOpen} onClose={() => setIsUserModalOpen(false)} title={editingUser?.id ? 'Editar Usuário' : 'Novo Usuário'}>
                <UserForm user={editingUser} onSave={handleUserSave} onCancel={() => setIsUserModalOpen(false)} />
            </Modal>
        </div>
    );
};

export default App;
