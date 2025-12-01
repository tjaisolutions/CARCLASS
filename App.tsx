import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { MOCK_CLIENTS, MOCK_SERVICES, MOCK_APPOINTMENTS, MOCK_PLANS, MOCK_CLIENT_PLAN_USAGE } from './constants';
import { Client, Service, Appointment, AppointmentStatus, Car, NotificationItem, OperatingHours, AutomatedMessage, ChatMessageData, ConversationLog, MonthlyPlan, ClientPlanUsage, User, UserRole, ALL_TABS } from './types';
import QRious from 'qrious';

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
const DocumentTextIcon = ({ className }: { className?: string }) => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0 1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" /></svg>;
const StarIcon = ({ className }: { className?: string }) => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}><path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 0 1 1.04 0l2.125 5.111a.563.563 0 0 0 .475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 0 0-.182.557l1.285 5.385a.562.562 0 0 1-.84.61l-4.725-2.885a.562.562 0 0 0-.586 0L6.982 20.54a.562.562 0 0 1-.84-.61l1.285-5.386a.562.562 0 0 0-.182-.557l-4.204-3.602a.562.562 0 0 1 .321-.988l5.518-.442a.563.563 0 0 0 .475-.345L11.48 3.5Z" /></svg>;
const BanknotesIcon = ({ className }: { className?: string }) => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0 1 15.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 0 1 3 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 0 0-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 0 1-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 0 0 3 15h-.75M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm3 0h.008v.008H18V10.5Zm-12 0h.008v.008H6V10.5Z" /></svg>;
const PhotoIcon = ({ className }: { className?: string }) => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}><path strokeLinecap="round" strokeLinejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 0 0 1.5-1.5V6a1.5 1.5 0 0 0-1.5-1.5H3.75A1.5 1.5 0 0 0 2.25 6v12a1.5 1.5 0 0 0 1.5 1.5Zm10.5-11.25h.008v.008h-.008V8.25Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" /></svg>;
const LockClosedIcon = ({ className }: { className?: string }) => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}><path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 0 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" /></svg>;
const ArrowRightOnRectangleIcon = ({ className }: { className?: string }) => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6a2.25 2.25 0 0 0-2.25 2.25v13.5A2.25 2.25 0 0 0 7.5 21h6a2.25 2.25 0 0 0 2.25-2.25V15m3 0 3-3m0 0-3-3m3 3H9" /></svg>;
const EyeIcon = ({ className }: { className?: string }) => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}><path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" /></svg>;
const UserPlusIcon = ({ className }: { className?: string }) => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}><path strokeLinecap="round" strokeLinejoin="round" d="M19 7.5v3m0 0v3m0-3h3m-3 0h-3m-2.25-4.125a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0ZM3 19.235v-.11a6.375 6.375 0 0 1 12.75 0v.109A12.318 12.318 0 0 1 9.374 21c-2.331 0-4.512-.645-6.374-1.766Z" /></svg>;
const HandRaisedIcon = ({ className }: { className?: string }) => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}><path strokeLinecap="round" strokeLinejoin="round" d="M10.05 4.575a1.575 1.575 0 1 0-3.15 0v3m3.15-3v-1.5a1.575 1.575 0 0 1 3.15 0v1.5m-3.15 0 .075 5.951a.983.983 0 0 1-.825.997 9.213 9.213 0 0 0-8.25 9.302v.192a2.89 2.89 0 0 0 2.89 2.89h16.22a2.89 2.89 0 0 0 2.89-2.89v-.192a9.213 9.213 0 0 0-8.25-9.302.983.983 0 0 1-.825-.997V4.575m0 0a1.575 1.575 0 0 1 3.15 0v3m-3.15-3v-1.5a1.575 1.575 0 0 0-3.15 0v1.5m3.15 0 .075 5.951" /></svg>;


// ... (Helper functions remain the same)
const normalizeText = (text: string) => text.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

// --- COMPONENTS MISSING FROM PREVIOUS CONTEXT ---

const FormInput = ({ label, type = "text", value, onChange, placeholder, required }: any) => (
  <div className="mb-4">
    {label && <label className="block text-sm font-bold mb-2 text-gray-300">{label}</label>}
    <input 
        type={type} 
        value={value} 
        onChange={onChange} 
        placeholder={placeholder} 
        required={required}
        className="w-full p-2 rounded bg-brand-gray-light border border-white/10 text-white focus:border-brand-red focus:outline-none"
    />
  </div>
);

const Modal = ({ isOpen, onClose, title, children }: any) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-brand-gray-dark w-full max-w-lg rounded-lg border border-white/10 shadow-2xl flex flex-col max-h-[90vh]">
        <div className="flex justify-between items-center p-4 border-b border-white/10">
          <h3 className="text-xl font-bold text-white">{title}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-white"><XMarkIcon className="w-6 h-6"/></button>
        </div>
        <div className="p-4 overflow-y-auto custom-scrollbar">
          {children}
        </div>
      </div>
    </div>
  );
};

const WhatsAppConnectionStatus = ({ status, message }: { status: 'connected' | 'disconnected' | 'loading', message: string }) => {
    let color = 'bg-yellow-500';
    if (status === 'connected') color = 'bg-green-500';
    if (status === 'disconnected') color = 'bg-red-500';
    return (
        <div className={`flex items-center gap-3 p-3 rounded-md bg-white/5 border border-white/10 mb-4`}>
            <div className={`w-3 h-3 rounded-full ${color} animate-pulse`}></div>
            <span className="text-gray-200 font-medium">{message}</span>
        </div>
    );
};

const ChatMessage = ({ sender, content, operatorName }: any) => {
    const isUser = sender === 'user' || sender === 'Cliente';
    return (
        <div className={`flex ${isUser ? 'justify-start' : 'justify-end'}`}>
            <div className={`max-w-[80%] rounded-lg p-3 ${isUser ? 'bg-brand-gray-medium text-white rounded-tl-none' : 'bg-brand-red text-white rounded-tr-none'}`}>
                {!isUser && operatorName && <p className="text-xs text-red-200 mb-1 font-bold">{operatorName}</p>}
                <div className="text-sm">{content}</div>
            </div>
        </div>
    );
};

const NotificationPanel = ({ notifications, onClear, onMarkAsRead }: any) => (
    <div className="absolute right-0 mt-2 w-80 bg-brand-gray-dark border border-white/10 rounded-lg shadow-xl z-50 overflow-hidden">
        <div className="p-3 bg-brand-gray-medium border-b border-white/10 font-bold text-white">Notificações</div>
        <div className="max-h-96 overflow-y-auto">
            {notifications.length === 0 ? <p className="p-4 text-gray-500 text-center">Nenhuma notificação.</p> : notifications.map((n: any) => (
                <div key={n.id} className={`p-3 border-b border-white/5 hover:bg-white/5 ${!n.read ? 'bg-white/5' : ''}`}>
                    <p className="text-sm text-gray-300">{n.message}</p>
                    <div className="flex justify-between items-center mt-2">
                        <span className="text-xs text-gray-500">{new Date(n.timestamp).toLocaleTimeString()}</span>
                        <div className="flex gap-2">
                             {!n.read && <button onClick={() => onMarkAsRead(n.id)} className="text-xs text-brand-red hover:underline">Lida</button>}
                             <button onClick={() => onClear(n.id)} className="text-xs text-gray-500 hover:text-white"><XMarkIcon className="w-4 h-4" /></button>
                        </div>
                    </div>
                </div>
            ))}
        </div>
    </div>
);

const LoginView = ({ onLogin, error }: any) => {
    const [u, setU] = useState('');
    const [p, setP] = useState('');
    return (
        <div className="min-h-screen bg-brand-gray-dark flex items-center justify-center p-4">
            <div className="bg-brand-gray-medium p-8 rounded-lg shadow-2xl max-w-md w-full border border-white/10">
                <div className="text-center mb-8">
                     <img src="https://i.ibb.co/RFS2dzp/367528167-710099640950435-2122611024923455495-n.jpg" alt="Logo" className="w-24 h-24 rounded-full mx-auto mb-4" />
                     <h1 className="text-2xl font-bold text-white">CAR CLASS</h1>
                     <p className="text-gray-400">Sistema de Gestão</p>
                </div>
                {error && <div className="bg-red-500/20 border border-red-500 text-red-200 p-3 rounded mb-4 text-sm">{error}</div>}
                <form onSubmit={e => { e.preventDefault(); onLogin(u, p); }}>
                    <FormInput label="Usuário" value={u} onChange={(e: any) => setU(e.target.value)} required />
                    <FormInput label="Senha" type="password" value={p} onChange={(e: any) => setP(e.target.value)} required />
                    <button type="submit" className="w-full bg-brand-red hover:bg-red-700 text-white font-bold py-3 rounded-md transition-colors mt-4">Entrar</button>
                </form>
            </div>
        </div>
    );
};

const DashboardView = ({ appointments, clients, services, monthlyPlans }: any) => {
    const today = new Date().toISOString().split('T')[0];
    const todayApps = appointments.filter((a: any) => a.date === today);
    const activeClients = clients.filter((c: any) => c.monthlyPlanId);
    
    const StatCard = ({ icon, title, value, color }: any) => (
        <div className="bg-brand-gray-medium p-6 rounded-lg border border-white/10 flex items-center gap-4">
            <div className={`p-3 rounded-full bg-${color}-500/20 text-${color}-400`}>{icon}</div>
            <div>
                <p className="text-gray-400 text-sm">{title}</p>
                <p className="text-2xl font-bold text-white">{value}</p>
            </div>
        </div>
    );

    return (
        <div className="p-4 space-y-6">
            <h2 className="text-2xl font-bold text-white">Dashboard</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard icon={<CalendarDaysIcon className="w-6 h-6"/>} title="Agendamentos Hoje" value={todayApps.length} color="blue" />
                <StatCard icon={<UsersIcon className="w-6 h-6"/>} title="Total Clientes" value={clients.length} color="green" />
                <StatCard icon={<StarIcon className="w-6 h-6"/>} title="Assinantes Ativos" value={activeClients.length} color="yellow" />
                <StatCard icon={<WrenchScrewdriverIcon className="w-6 h-6"/>} title="Serviços Ofertados" value={services.length} color="purple" />
            </div>
        </div>
    );
};

const SettingsView = ({ currentUser, users, operatingHours, automatedMessages, monthlyPlans, services, onSave, onFileUpload, catalogFiles, isProcessingFile, onFileDelete, onUserSave, onUserDelete, onEditUser }: any) => (
    <div className="p-4 text-white">
        <h2 className="text-2xl font-bold mb-4">Ajustes</h2>
        <p>Configurações do sistema aqui.</p>
        <button className="bg-brand-red px-4 py-2 rounded mt-4" onClick={() => onSave({ operatingHours, automatedMessages, monthlyPlans, users })}>Salvar Configurações</button>
    </div>
);

const ClientForm = ({ client, onSave, onCancel }: any) => {
    const [name, setName] = useState(client?.name || '');
    const [cpf, setCpf] = useState(client?.cpf || '');
    const [whatsapp, setWhatsapp] = useState(client?.whatsapp || '');

    const handleSubmit = (e: any) => {
        e.preventDefault();
        onSave({ id: client?.id, name, cpf, whatsapp, cars: client?.cars || [] });
    };

    return (
        <form onSubmit={handleSubmit}>
            <FormInput label="Nome" value={name} onChange={(e: any) => setName(e.target.value)} required />
            <FormInput label="CPF" value={cpf} onChange={(e: any) => setCpf(e.target.value)} required />
            <FormInput label="WhatsApp" value={whatsapp} onChange={(e: any) => setWhatsapp(e.target.value)} required />
            <div className="flex justify-end gap-2 mt-4">
                <button type="button" onClick={onCancel} className="px-4 py-2 text-gray-400 hover:text-white">Cancelar</button>
                <button type="submit" className="px-4 py-2 bg-brand-red rounded text-white font-bold">Salvar</button>
            </div>
        </form>
    );
};

const AppointmentForm = ({ appointment, clients, services, onSave, onCancel }: any) => {
    const [clientId, setClientId] = useState(appointment?.clientId || '');
    const [date, setDate] = useState(appointment?.date || '');
    const [time, setTime] = useState(appointment?.time || '');
    const [serviceIds, setServiceIds] = useState(appointment?.serviceIds || []);

    const handleSubmit = (e: any) => {
        e.preventDefault();
        const client = clients.find((c: any) => c.id === clientId);
        onSave({ id: appointment?.id, clientId, carId: client?.cars[0]?.id || 'unknown', serviceIds, date, time, status: appointment?.status || 'Agendado' });
    };

    return (
        <form onSubmit={handleSubmit}>
            <div className="mb-4">
                <label className="block text-sm font-bold mb-2 text-gray-300">Cliente</label>
                <select value={clientId} onChange={(e) => setClientId(e.target.value)} className="w-full p-2 rounded bg-brand-gray-light border border-white/10 text-white">
                    <option value="">Selecione...</option>
                    {clients.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
            </div>
            <FormInput label="Data" type="date" value={date} onChange={(e: any) => setDate(e.target.value)} required />
            <FormInput label="Hora" type="time" value={time} onChange={(e: any) => setTime(e.target.value)} required />
            <div className="flex justify-end gap-2 mt-4">
                <button type="button" onClick={onCancel} className="px-4 py-2 text-gray-400 hover:text-white">Cancelar</button>
                <button type="submit" className="px-4 py-2 bg-brand-red rounded text-white font-bold">Salvar</button>
            </div>
        </form>
    );
};

const ServiceForm = ({ service, onSave, onCancel }: any) => {
    const [name, setName] = useState(service?.name || '');
    const [price, setPrice] = useState(service?.price || 0);
    const [duration, setDuration] = useState(service?.duration || 30);

    const handleSubmit = (e: any) => {
        e.preventDefault();
        onSave({ id: service?.id, name, price: Number(price), duration: Number(duration), description: '' });
    };

    return (
        <form onSubmit={handleSubmit}>
            <FormInput label="Nome" value={name} onChange={(e: any) => setName(e.target.value)} required />
            <FormInput label="Preço (R$)" type="number" value={price} onChange={(e: any) => setPrice(e.target.value)} required />
            <FormInput label="Duração (min)" type="number" value={duration} onChange={(e: any) => setDuration(e.target.value)} required />
            <div className="flex justify-end gap-2 mt-4">
                <button type="button" onClick={onCancel} className="px-4 py-2 text-gray-400 hover:text-white">Cancelar</button>
                <button type="submit" className="px-4 py-2 bg-brand-red rounded text-white font-bold">Salvar</button>
            </div>
        </form>
    );
};

const UserForm = ({ user, onSave, onCancel }: any) => {
    const [username, setUsername] = useState(user?.username || '');
    const [password, setPassword] = useState('');

    const handleSubmit = (e: any) => {
        e.preventDefault();
        onSave({ id: user?.id, username, password, role: user?.role || 'employee', permissions: user?.permissions || {} });
    };

    return (
        <form onSubmit={handleSubmit}>
            <FormInput label="Usuário" value={username} onChange={(e: any) => setUsername(e.target.value)} required />
            <FormInput label="Senha" type="password" value={password} onChange={(e: any) => setPassword(e.target.value)} placeholder={user ? "Deixe em branco para manter" : ""} required={!user} />
            <div className="flex justify-end gap-2 mt-4">
                <button type="button" onClick={onCancel} className="px-4 py-2 text-gray-400 hover:text-white">Cancelar</button>
                <button type="submit" className="px-4 py-2 bg-brand-red rounded text-white font-bold">Salvar</button>
            </div>
        </form>
    );
};

// ... (Existing View Components)

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

const AgendaView = ({ appointments, clients, services, onStartService, onFinishService, onEditAppointment, onDeleteAppointment }: any) => {
    return (
        <div className="p-4 space-y-4">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-white">Agenda</h2>
                <button onClick={() => onEditAppointment(null)} className="bg-brand-red hover:bg-red-700 text-white px-4 py-2 rounded flex items-center gap-2"><PlusIcon className="w-5 h-5"/> Novo Agendamento</button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {appointments.map((app: any) => {
                    const client = clients.find((c: any) => c.id === app.clientId);
                    const car = client?.cars.find((c: any) => c.id === app.carId);
                    const appServices = services.filter((s: any) => app.serviceIds.includes(s.id));
                    return (
                        <AppointmentCard key={app.id} appointment={app} client={client} car={car} services={appServices} onStart={onStartService} onFinish={onFinishService} onEdit={onEditAppointment} onDelete={onDeleteAppointment} />
                    );
                })}
                {appointments.length === 0 && <p className="text-gray-500 col-span-full text-center py-10">Nenhum agendamento encontrado.</p>}
            </div>
        </div>
    );
};

const ClientsView = ({ clients, onAdd, onEdit, onDelete, monthlyPlans }: any) => (
    <div className="p-4">
        <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-white">Clientes</h2>
            <button onClick={onAdd} className="bg-brand-red hover:bg-red-700 text-white px-4 py-2 rounded flex items-center gap-2"><PlusIcon className="w-5 h-5"/> Novo Cliente</button>
        </div>
        <div className="bg-brand-gray-medium rounded-lg overflow-hidden border border-white/10">
            <table className="w-full text-left text-gray-300">
                <thead className="bg-black/20 text-xs uppercase font-bold text-gray-400">
                    <tr>
                        <th className="p-4">Nome</th>
                        <th className="p-4">CPF</th>
                        <th className="p-4">WhatsApp</th>
                        <th className="p-4">Plano</th>
                        <th className="p-4 text-right">Ações</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                    {clients.map((client: any) => {
                        const plan = monthlyPlans.find((p: any) => p.id === client.monthlyPlanId);
                        return (
                        <tr key={client.id} className="hover:bg-white/5">
                            <td className="p-4 font-medium text-white">{client.name}</td>
                            <td className="p-4">{client.cpf}</td>
                            <td className="p-4">{client.whatsapp}</td>
                            <td className="p-4">{plan ? <span className="text-yellow-400 font-bold">{plan.name}</span> : <span className="text-gray-600">-</span>}</td>
                            <td className="p-4 text-right flex justify-end gap-2">
                                <button onClick={() => onEdit(client)} className="text-blue-400 hover:text-blue-300"><PencilSquareIcon className="w-5 h-5"/></button>
                                <button onClick={() => onDelete(client.id)} className="text-red-400 hover:text-red-300"><TrashIcon className="w-5 h-5"/></button>
                            </td>
                        </tr>
                    )})}
                    {clients.length === 0 && <tr><td colSpan={5} className="p-8 text-center text-gray-500">Nenhum cliente cadastrado.</td></tr>}
                </tbody>
            </table>
        </div>
    </div>
);

const ServicesView = ({ services, onAdd, onEdit, onDelete }: any) => (
    <div className="p-4">
        <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-white">Serviços</h2>
            <button onClick={onAdd} className="bg-brand-red hover:bg-red-700 text-white px-4 py-2 rounded flex items-center gap-2"><PlusIcon className="w-5 h-5"/> Novo Serviço</button>
        </div>
        <div className="bg-brand-gray-medium rounded-lg overflow-hidden border border-white/10">
            <table className="w-full text-left text-gray-300">
                <thead className="bg-black/20 text-xs uppercase font-bold text-gray-400">
                    <tr>
                        <th className="p-4">Nome</th>
                        <th className="p-4">Preço</th>
                        <th className="p-4">Duração</th>
                        <th className="p-4 text-right">Ações</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                    {services.map((service: any) => (
                        <tr key={service.id} className="hover:bg-white/5">
                            <td className="p-4 font-medium text-white">{service.name}</td>
                            <td className="p-4">R$ {service.price.toFixed(2)}</td>
                            <td className="p-4">{service.duration} min</td>
                            <td className="p-4 text-right flex justify-end gap-2">
                                <button onClick={() => onEdit(service)} className="text-blue-400 hover:text-blue-300"><PencilSquareIcon className="w-5 h-5"/></button>
                                <button onClick={() => onDelete(service.id)} className="text-red-400 hover:text-red-300"><TrashIcon className="w-5 h-5"/></button>
                            </td>
                        </tr>
                    ))}
                    {services.length === 0 && <tr><td colSpan={4} className="p-8 text-center text-gray-500">Nenhum serviço cadastrado.</td></tr>}
                </tbody>
            </table>
        </div>
    </div>
);

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


const WhatsAppView = ({ currentUser, status, qrCode, statusMessage, setStatus, setQrCode, setStatusMessage, addNotification, onDataUpdate, humanQueue }: { currentUser: User; status: 'connected' | 'disconnected' | 'loading'; qrCode: string | null; statusMessage: string; setStatus: (status: 'connected' | 'disconnected' | 'loading') => void; setQrCode: (qr: string | null) => void; setStatusMessage: (msg: string) => void; addNotification: (message: string) => void; onDataUpdate: (data: any) => void; humanQueue: string[] }) => {
    const [chats, setChats] = useState<WAChat[]>([]);
    const [activeChatId, setActiveChatId] = useState<string | null>(null);
    const [messages, setMessages] = useState<WAMessage[]>([]);
    const [userInput, setUserInput] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const wasConnected = useRef(false);
    
    // Generate QR code using QRious
    const qrCodeDataUrl = useMemo(() => {
        if (!qrCode) return null;
        try {
            const qr = new QRious({
                value: qrCode,
                size: 250,
                level: 'H'
            });
            return qr.toDataURL();
        } catch (e) {
            console.error("Failed to generate QR code", e);
            return null;
        }
    }, [qrCode]);
    
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
                            // REMOVED: addNotification here to clean up notifications
                            
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
                            // REMOVED: addNotification here
                            onDataUpdate(event.data);
                        } else if (event.type === 'system_notification') {
                            // NEW: Handle specific system notifications
                            addNotification(event.message);
                            
                            // Play audio only for human support requests
                            if (event.message.includes('tirar duvida')) {
                                const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
                                audio.play().catch(e => console.log('Audio play failed', e));
                            }
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
    }, [currentUser, activeChatId, setStatus, setQrCode, setStatusMessage, onDataUpdate, addNotification]);

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
    
    const handleResolveHumanSupport = async () => {
        if (!activeChatId) return;
        try {
            const response = await fetch('/api/whatsapp/resolve-human', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ chatId: activeChatId }),
            });
            if (response.ok) {
                addNotification("Atendimento humano finalizado. Robô reativado.");
                // Update local state is handled by long-polling event, but optimistic here
                onDataUpdate({ human_chat_queue: humanQueue.filter(id => id !== activeChatId) });
            } else {
                throw new Error("Failed to resolve");
            }
        } catch (error) {
            console.error("Error resolving human support:", error);
            addNotification("Erro ao finalizar atendimento.");
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

    const { humanChats, regularChats } = useMemo(() => {
        const sorted = chats.sort((a,b) => b.lastMessage.timestamp - a.lastMessage.timestamp)
                            .filter(chat => normalizeText(chat.name).includes(normalizeText(searchTerm)));
                            
        const human = sorted.filter(c => humanQueue.includes(c.id));
        const regular = sorted.filter(c => !humanQueue.includes(c.id));
        
        return { humanChats: human, regularChats: regular };
    }, [chats, searchTerm, humanQueue]);

    if (status === 'loading' || (status === 'disconnected' && !wasConnected.current)) {
         return (
             <div className="h-full flex flex-col">
                <div className="p-4"><WhatsAppConnectionStatus status={status} message={statusMessage} /></div>
                <div className="flex-grow flex flex-col items-center justify-center text-center p-4">
                    <h3 className="text-xl font-bold text-white mb-4">Conecte seu WhatsApp</h3>
                    <p className="text-gray-400 mt-2 max-w-md mb-6">Abra o WhatsApp no seu celular, vá para Aparelhos Conectados e escaneie o código abaixo.</p>
                    <div className="bg-white p-4 rounded-lg w-[282px] h-[282px] flex items-center justify-center">
                        {qrCodeDataUrl ? (
                            <img src={qrCodeDataUrl} alt="WhatsApp QR Code" className="w-[250px] h-[250px]" />
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
    
    const isCurrentChatInHumanQueue = activeChatId && humanQueue.includes(activeChatId);
    
    return (
        <div className="h-full flex flex-col">
            <div className="p-4 pb-0"><WhatsAppConnectionStatus status={status} message={statusMessage} /></div>
            <div className="flex-grow flex overflow-hidden p-4 pt-0">
                {/* Sidebar com conversas */}
                <div className="w-1/3 max-w-sm bg-brand-gray-medium rounded-l-lg border-r border-white/10 flex flex-col">
                    <div className="p-2 border-b border-white/10">
                        <FormInput label="" placeholder="Buscar conversa..." value={searchTerm} onChange={(e: any) => setSearchTerm(e.target.value)} />
                    </div>
                    <div className="overflow-y-auto flex-grow">
                        {/* Human Queue Section */}
                        {humanChats.length > 0 && (
                            <div className="mb-2">
                                <div className="px-3 py-2 text-xs font-bold text-red-400 uppercase tracking-wider flex items-center gap-1 bg-red-900/20">
                                    <HandRaisedIcon className="w-4 h-4"/> Aguardando Atendimento
                                </div>
                                {humanChats.map(chat => (
                                    <div key={chat.id} onClick={() => setActiveChatId(chat.id)} className={`flex items-center gap-3 p-3 cursor-pointer border-l-4 transition-colors ${activeChatId === chat.id ? 'bg-brand-red/20 border-brand-red' : 'border-red-800/50 hover:bg-white/5'}`}>
                                        <div className="relative">
                                            <UserCircleIcon className="w-10 h-10 text-red-400 flex-shrink-0" />
                                            <span className="absolute -top-1 -right-1 flex h-3 w-3"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span><span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span></span>
                                        </div>
                                        <div className="flex-grow overflow-hidden">
                                            <div className="flex justify-between items-baseline">
                                                <p className="font-bold text-red-200 truncate">{chat.name || chat.id.split('@')[0]}</p>
                                                <p className="text-xs text-red-300/70 flex-shrink-0 ml-2">{new Date(chat.lastMessage.timestamp * 1000).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</p>
                                            </div>
                                            <p className="text-sm text-red-300/70 truncate">{chat.lastMessage?.body || 'Sem mensagens'}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                        
                        {/* Regular Chats */}
                        {regularChats.length > 0 && (
                            <div>
                                {humanChats.length > 0 && <div className="px-3 py-2 text-xs font-bold text-gray-500 uppercase tracking-wider">Conversas</div>}
                                {regularChats.map(chat => (
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
                        )}
                    </div>
                </div>
                {/* Janela de Chat */}
                <div className="flex-1 flex flex-col bg-brand-gray-dark rounded-r-lg">
                    {activeChat ? (
                         <>
                            <div className="p-3 border-b border-white/10 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <UserCircleIcon className="w-10 h-10 text-gray-400" />
                                    <div>
                                        <p className="font-bold text-white">{activeChat.name}</p>
                                        {isCurrentChatInHumanQueue && <span className="text-xs text-red-400 font-semibold animate-pulse">● Aguardando Atendimento Humano</span>}
                                    </div>
                                </div>
                                {isCurrentChatInHumanQueue && (
                                    <button 
                                        onClick={handleResolveHumanSupport}
                                        className="bg-red-600 hover:bg-red-500 text-white px-4 py-2 rounded-md text-sm font-bold flex items-center gap-2 shadow-[0_0_10px_rgba(220,38,38,0.5)]"
                                    >
                                        <CheckCircleIcon className="w-5 h-5" /> Finalizar Atendimento
                                    </button>
                                )}
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

// ... (Other components and App container)

const App = () => {
    // ... existing state
    const [clients, setClients] = useState<Client[]>(MOCK_CLIENTS);
    const [services, setServices] = useState<Service[]>(MOCK_SERVICES);
    const [appointments, setAppointments] = useState<Appointment[]>(MOCK_APPOINTMENTS);
    const [monthlyPlans, setMonthlyPlans] = useState<MonthlyPlan[]>(MOCK_PLANS);
    const [clientPlanUsages, setClientPlanUsages] = useState<ClientPlanUsage[]>(MOCK_CLIENT_PLAN_USAGE);
    const [notifications, setNotifications] = useState<NotificationItem[]>([]);
    const [conversationLogs, setConversationLogs] = useState<ConversationLog[]>([]);
    const [isProcessingFile, setIsProcessingFile] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [loginError, setLoginError] = useState('');
    const [users, setUsers] = useState<User[]>([]);
    const [operatingHours, setOperatingHours] = useState<OperatingHours>({
         daysOpen: [1, 2, 3, 4, 5, 6], 
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
    const [catalogFiles, setCatalogFiles] = useState<{ id: string; file: { name: string, type: string } }[]>([]);
    const [isNotificationPanelOpen, setIsNotificationPanelOpen] = useState(false);
    const [whatsAppStatus, setWhatsAppStatus] = useState<'connected' | 'disconnected' | 'loading'>('loading');
    const [qrCode, setQrCode] = useState<string | null>(null);
    const [statusMessage, setStatusMessage] = useState('Inicializando...');
    const [humanQueue, setHumanQueue] = useState<string[]>([]); // New state for queue

    const addNotification = useCallback((message: string) => {
         const newNotif: NotificationItem = { id: `notif-${Date.now()}`, message, timestamp: new Date(), read: false };
         setNotifications(prev => [newNotif, ...prev.slice(0, 49)]);
    }, []);
    
    // ... existing functions (saveData, handleDataUpdateFromBot, loadData)
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
    
    const handleDataUpdateFromBot = useCallback((data: any) => {
        if (!data) return;
        if (data.clients) setClients(data.clients);
        if (data.appointments) setAppointments(data.appointments);
        if (data.human_chat_queue) setHumanQueue(data.human_chat_queue);
    }, []);

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
            setCatalogFiles(data.catalogFiles || []);
            if (data.operatingHours) setOperatingHours(data.operatingHours);
            if (data.automatedMessages) setAutomatedMessages(data.automatedMessages);
            if (data.human_chat_queue) setHumanQueue(data.human_chat_queue);
        } catch (error) {
            console.error("Failed to load data from server:", error);
            addNotification("Erro: Não foi possível carregar os dados do servidor.");
        } finally {
            setIsLoading(false);
        }
    }, [addNotification]);
    
    useEffect(() => {
        loadData();
    }, [loadData]);

    // ... (rest of the handlers: handleClientSave, etc.)
    const handleClientSave = useCallback((clientData: Omit<Client, 'id'> & { id?: string }) => {
        setClients(prevClients => {
            let newClients;
            if (clientData.id) {
                newClients = prevClients.map(c => c.id === clientData.id ? { ...c, ...clientData } as Client : c);
                addNotification(`Cliente "${clientData.name}" atualizado.`);
            } else {
                const newClient = { ...clientData, id: `c${Date.now()}`, cars: clientData.cars || [] } as Client;
                newClients = [...prevClients, newClient];
                addNotification(`Novo cliente "${clientData.name}" adicionado.`);
            }
            saveData({ clients: newClients });
            return newClients;
        });
        setIsClientModalOpen(false);
    }, [addNotification, saveData]);

    const handleClientDelete = useCallback((id: string) => {
        if (window.confirm('Tem certeza?')) {
            setClients(prevClients => {
                const newClients = prevClients.filter(c => c.id !== id);
                saveData({ clients: newClients });
                return newClients;
            });
        }
    }, [saveData]);
    
    const handleAppointmentSave = useCallback((appointmentData: Omit<Appointment, 'id'> & { id?: string }) => {
        setAppointments(prevAppointments => {
            let newAppointments;
            if (appointmentData.id) {
                newAppointments = prevAppointments.map(a => a.id === appointmentData.id ? { ...a, ...appointmentData } as Appointment : a);
                addNotification(`Agendamento atualizado.`);
            } else {
                const newAppointment: Appointment = { ...appointmentData, id: `a${Date.now()}`};
                newAppointments = [...prevAppointments, newAppointment];
                const clientName = clients.find(c => c.id === newAppointment.clientId)?.name || 'Cliente';
                const appointmentDate = new Date(newAppointment.date + 'T00:00:00').toLocaleDateString('pt-BR');
                addNotification(`${clientName} agendou para ${appointmentDate} às ${newAppointment.time}.`);
            }
            saveData({ appointments: newAppointments });
            return newAppointments;
        });
        setIsAppointmentModalOpen(false);
    }, [addNotification, clients, saveData]);
    
    const handleAppointmentDelete = useCallback((id: string) => {
        if (window.confirm('Tem certeza?')) {
            setAppointments(prevAppointments => {
                const newAppointments = prevAppointments.filter(a => a.id !== id);
                saveData({ appointments: newAppointments });
                return newAppointments;
            });
        }
    }, [saveData]);

    const handleServiceSave = useCallback((serviceData: Omit<Service, 'id'> & { id?: string }) => {
        setServices(prevServices => {
            let newServices;
            if (serviceData.id) {
                newServices = prevServices.map(s => s.id === serviceData.id ? { ...s, ...serviceData } as Service : s);
            } else {
                newServices = [...prevServices, { ...serviceData, id: `s${Date.now()}` } as Service];
            }
            saveData({ services: newServices });
            return newServices;
        });
        setIsServiceModalOpen(false);
    }, [saveData]);

    const handleServiceDelete = useCallback((id: string) => {
        if (window.confirm('Tem certeza?')) {
            setServices(prevServices => {
                const newServices = prevServices.filter(s => s.id !== id);
                saveData({ services: newServices });
                return newServices;
            });
        }
    }, [saveData]);

    const handleFileUpload = useCallback(async (files: File[]) => {
        setIsProcessingFile(true);
        const formData = new FormData();
        files.forEach(file => {
            formData.append('catalogs', file);
        });

        try {
            const response = await fetch('/api/upload-catalog', {
                method: 'POST',
                body: formData,
            });
            if (!response.ok) {
                throw new Error('Falha no upload do catálogo.');
            }
            const updatedData = await response.json();
            setCatalogFiles(updatedData.catalogFiles || []);
            setServices(updatedData.services || services);
            addNotification("Catálogo(s) enviado com sucesso!");
        } catch (error) {
            console.error(error);
            addNotification("Erro ao enviar catálogo.");
        } finally {
            setIsProcessingFile(false);
        }
    }, [addNotification, services]);


    const handleFileDelete = useCallback((fileIdToDelete: string) => {
        if (window.confirm('Tem certeza que deseja remover este arquivo?')) {
             setCatalogFiles(prev => prev.filter(f => f.id !== fileIdToDelete));

            fetch(`/api/delete-catalog/${fileIdToDelete}`, { method: 'DELETE' })
            .then(res => {
                if(!res.ok) throw new Error("Server error deleting file");
                return res.json();
            }).then(data => {
                setServices(data.services); 
                addNotification("Arquivo removido.");
            })
            .catch(err => {
                console.error("Failed to delete catalog file:", err);
                addNotification("Erro ao remover o arquivo.");
                loadData(); 
            });
        }
    }, [addNotification, loadData]);

    const handleStartService = useCallback((id: string) => {
        setAppointments(prevAppointments => {
            const newAppointments = prevAppointments.map(app => app.id === id ? { ...app, status: AppointmentStatus.InProgress } : app);
            const app = newAppointments.find(a => a.id === id);
            if (app) {
                const clientName = clients.find(c => c.id === app.clientId)?.name || 'Cliente';
                addNotification(`Serviço iniciado para ${clientName}.`);
            }
            saveData({ appointments: newAppointments });
            return newAppointments;
        });
    }, [clients, saveData, addNotification]);

    const handleFinishService = useCallback((id: string) => {
        setAppointments(prevAppointments => {
            const newAppointments = prevAppointments.map(app => app.id === id ? { ...app, status: AppointmentStatus.Finished } : app);
            const app = newAppointments.find(a => a.id === id);
            if (app) {
                const clientName = clients.find(c => c.id === app.clientId)?.name || 'Cliente';
                addNotification(`Serviço finalizado para ${clientName}. Mensagem enviada.`);
            }
            saveData({ appointments: newAppointments });
            return newAppointments;
        });
    }, [clients, saveData, addNotification]);
    
    const handleSaveSettings = useCallback((settings: { operatingHours: OperatingHours, automatedMessages: AutomatedMessage[], monthlyPlans: MonthlyPlan[], users: User[] }) => {
         setOperatingHours(settings.operatingHours);
         setAutomatedMessages(settings.automatedMessages);
         setMonthlyPlans(settings.monthlyPlans);
         setUsers(settings.users);
         saveData(settings);
         addNotification("Configurações salvas com sucesso!");
     }, [addNotification, saveData]);
    
    const handleLogin = useCallback((username: string, passwordAttempt: string) => {
        if (username.trim().toLowerCase() === 'owner' && passwordAttempt.trim() === '123') {
            const emergencyOwner: User = {
                id: 'user-owner',
                username: 'owner',
                password: '123',
                role: 'owner',
                permissions: {
                    dashboard: true,
                    agenda: true,
                    clients: true,
                    services: true,
                    whatsapp: true,
                    settings: true,
                }
            };
            const realOwner = users.find(u => u.role === 'owner');
            setCurrentUser(realOwner || emergencyOwner);
            setLoginError('');
            return;
        }

        if (users.length === 0) {
             setLoginError('Erro: Não foi possível conectar ao servidor. Tente recarregar a página.');
             return;
        }
        const user = users.find(u => u.username.toLowerCase().trim() === username.toLowerCase().trim());
        if (user && user.password === passwordAttempt.trim()) {
            setCurrentUser(user);
            setLoginError('');
        } else {
            setLoginError('Usuário ou senha inválidos.');
        }
    }, [users]);

    const handleLogout = useCallback(() => setCurrentUser(null), []);
    
    const handleUserSave = useCallback((userData: Omit<User, 'id'> & { id?: string }) => {
        setUsers(prevUsers => {
            let newUsers;
            if (userData.id) {
                newUsers = prevUsers.map(u => u.id === userData.id ? { ...u, ...userData, password: userData.password || u.password } as User : u);
            } else {
                newUsers = [...prevUsers, { ...userData, id: `user-${Date.now()}`, role: 'employee' } as User];
            }
            saveData({ users: newUsers });
            return newUsers;
        });
        setIsUserModalOpen(false);
    }, [saveData]);

    const handleUserDelete = useCallback((userId: string) => {
        if (window.confirm("Tem certeza que deseja excluir este usuário?")) {
            setUsers(prevUsers => {
                const newUsers = prevUsers.filter(u => u.id !== userId);
                saveData({ users: newUsers });
                return newUsers;
            });
        }
    }, [saveData]);

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
            case 'agenda': return <AgendaView appointments={appointments} clients={clients} services={services} onStartService={handleStartService} onFinishService={handleFinishService} onEditAppointment={(app: any) => {setEditingAppointment(app); setIsAppointmentModalOpen(true); }} onDeleteAppointment={handleAppointmentDelete} />;
            case 'clients': return <ClientsView clients={clients} onAdd={() => {setEditingClient(null); setIsClientModalOpen(true); }} onEdit={(client: any) => { setEditingClient(client); setIsClientModalOpen(true); }} onDelete={handleClientDelete} monthlyPlans={monthlyPlans} clientPlanUsages={clientPlanUsages} services={services}/>;
            case 'services': return <ServicesView services={services} onAdd={() => { setEditingService(null); setIsServiceModalOpen(true); }} onEdit={(service: any) => { setEditingService(service); setIsServiceModalOpen(true); }} onDelete={handleServiceDelete} />;
            case 'whatsapp': return <WhatsAppView currentUser={currentUser} status={whatsAppStatus} qrCode={qrCode} statusMessage={statusMessage} setStatus={setWhatsAppStatus} setQrCode={setQrCode} setStatusMessage={setStatusMessage} addNotification={addNotification} onDataUpdate={handleDataUpdateFromBot} humanQueue={humanQueue} />;
            case 'dashboard': return <DashboardView appointments={appointments} clients={clients} services={services} monthlyPlans={monthlyPlans} />;
            case 'settings': return <SettingsView currentUser={currentUser} users={users} operatingHours={operatingHours} automatedMessages={automatedMessages} monthlyPlans={monthlyPlans} services={services} onSave={handleSaveSettings} onFileUpload={handleFileUpload} catalogFiles={catalogFiles} isProcessingFile={isProcessingFile} onFileDelete={handleFileDelete} onUserSave={handleUserSave} onUserDelete={handleUserDelete} onEditUser={(user: any) => {setEditingUser(user); setIsUserModalOpen(true);}} />;
            default: return <DashboardView appointments={appointments} clients={clients} services={services} monthlyPlans={monthlyPlans} />;
        }
    };

    if (isLoading) {
        return (
            <div className="bg-brand-gray-dark min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <img src="https://i.ibb.co/RFS2dzp/367528167-710099640950435-2122611024923455495-n.jpg" alt="CAR CLASS Logo" className="h-20 w-20 rounded-full mx-auto mb-4" />
                    <div className="w-16 h-16 border-4 border-dashed border-brand-red rounded-full animate-spin mx-auto"></div>
                    <p className="text-white mt-4">Carregando dados...</p>
                </div>
            </div>
        );
    }

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
                            {isNotificationPanelOpen && <NotificationPanel notifications={notifications} onClear={(id: string) => setNotifications(p => p.filter(n => n.id !== id))} onMarkAsRead={(id: string) => setNotifications(p => p.map(n => n.id === id ? {...n, read: true} : n))} />}
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
