



import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { MOCK_CLIENTS, MOCK_SERVICES, MOCK_APPOINTMENTS, MOCK_PLANS, MOCK_CLIENT_PLAN_USAGE } from './constants';
import { Client, Service, Appointment, AppointmentStatus, Car, NotificationItem, OperatingHours, AutomatedMessage, ChatMessageData, ConversationLog, MonthlyPlan, ClientPlanUsage } from './types';

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
                    <select
                        id="sort-order"
                        value={sortBy}
                        onChange={e => setSortBy(e.target.value as AgendaSortBy)}
                        className="w-full bg-brand-gray-dark border border-brand-gray-light text-white rounded-md p-2 focus:ring-brand-red focus:border-brand-red"
                    >
                        <option value="default">Padrão (Mais Antigo)</option>
                        <option value="recent">Mais Recente</option>
                        <option value="time_asc">Hora (Crescente)</option>
                        <option value="time_desc">Hora (Decrescente)</option>
                    </select>
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


type ChatMessageProps = { sender: string; children?: React.ReactNode; isBot?: boolean; isTyping?: boolean; };
const ChatMessage: React.FC<ChatMessageProps> = ({ sender, children, isBot, isTyping }) => (
    <div className={`flex items-end gap-2 ${isBot ? 'justify-start' : 'justify-end'}`}>
        {isBot && <div className="w-8 h-8 bg-brand-red rounded-full flex-shrink-0 mb-8" />}
        <div className={`flex flex-col ${isBot ? 'items-start' : 'items-end'}`}>
            <span className="text-xs text-gray-400 mb-1 px-2">{sender}</span>
            <div className={`max-w-xs md:max-w-md p-3 rounded-2xl ${isBot ? 'bg-brand-gray-light text-gray-200 rounded-bl-none' : 'bg-brand-red/80 text-white rounded-br-none'}`}>
                {isTyping ? <div className="flex items-center gap-1"><div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse"></div><div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse delay-150"></div><div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse delay-300"></div></div> : children}
            </div>
        </div>
    </div>
);

const FileAttachment = ({ fileName, fileType }: { fileName: string; fileType: 'pdf' | 'jpg' }) => (
    <div className="bg-brand-gray-dark border border-white/10 rounded-lg p-3 flex items-center gap-3">
        {fileType === 'pdf' ? 
            <DocumentTextIcon className="w-10 h-10 text-brand-red flex-shrink-0"/> :
            <PhotoIcon className="w-10 h-10 text-brand-red flex-shrink-0"/>
        }
        <div className="overflow-hidden">
            <p className="text-white font-semibold truncate">{fileName}</p>
            <p className="text-xs text-gray-400">{fileType === 'pdf' ? 'Documento PDF' : 'Imagem JPG'}</p>
        </div>
    </div>
);

const ImageAttachment = ({ file }: { file: File }) => {
    const [imageUrl, setImageUrl] = useState('');

    useEffect(() => {
        // Create an object URL from the file
        const url = URL.createObjectURL(file);
        setImageUrl(url);

        // Clean up the object URL when the component unmounts
        return () => {
            URL.revokeObjectURL(url);
        };
    }, [file]);

    if (!imageUrl) {
        return ( // A simple loader
            <div className="bg-brand-gray-dark border border-white/10 rounded-lg p-3 flex items-center justify-center h-24 w-24">
                <ArrowPathIcon className="w-6 h-6 text-gray-400 animate-spin" />
            </div>
        );
    }

    return (
        <a href={imageUrl} target="_blank" rel="noopener noreferrer" className="block max-w-[200px] bg-brand-gray-dark p-1 rounded-lg border border-white/10 hover:border-brand-red transition-colors">
            <img src={imageUrl} alt={file.name} className="max-w-full h-auto rounded-md" />
        </a>
    );
};

const WhatsAppConnectionStatus = ({ status }: { status: 'connected' | 'disconnected' | 'loading' }) => {
    const statusConfig = {
        connected: { text: 'Conectado 24/7', color: 'text-green-400', iconColor: 'text-green-500' },
        disconnected: { text: 'Desconectado', color: 'text-red-400', iconColor: 'text-red-500' },
        loading: { text: 'Conectando...', color: 'text-yellow-400', iconColor: 'text-yellow-500' }
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

type ConversationState = 'GREETING' | 'AWAITING_IS_CLIENT_RESPONSE' | 'AWAITING_CPF' | 'AWAITING_EXISTING_APPOINTMENT_ACTION' | 'AWAITING_CANCELLATION_CONFIRMATION' | 'AWAITING_NEW_CLIENT_NAME' | 'AWAITING_NEW_CLIENT_CPF' | 'AWAITING_PLAN_INTEREST' | 'AWAITING_PLAN_SELECTION' | 'AWAITING_SERVICE_CHOICE_METHOD' | 'AWAITING_SERVICE_SELECTION' | 'AWAITING_DATE_AND_TIME_CHOICE' | 'AWAITING_VEHICLE_CONFIRMATION' | 'AWAITING_NEW_VEHICLE_MODEL' | 'AWAITING_NEW_VEHICLE_PLATE' | 'AWAITING_NEW_VEHICLE_PROTECTION_INFO' | 'AWAITING_NEW_VEHICLE_PROTECTION_DETAILS' | 'AWAITING_PAYMENT_METHOD' | 'CONFIRMATION' | 'FINISHED';

type TempAppointmentData = {
    appointmentToChangeId?: string; // For rescheduling
    clientId?: string;
    clientName?: string;
    clientCpf?: string;
    serviceIds?: string[];
    date?: string;
    time?: string;
    carId?: string; // For existing car
    carModel?: string; // For new car
    carPlate?: string; // For new car
    protections?: string[]; // For new car
    paymentMethod?: Appointment['paymentMethod'];
};

const WhatsAppView = ({ status, services, clients, appointments, onClientAdded, onClientUpdated, onAppointmentFinalized, onAppointmentRescheduled, onAppointmentCancelled, operatingHours, onConversationFinished, catalogFiles, monthlyPlans, clientPlanUsages, conversationLogs, onConnect }: { status: 'connected' | 'disconnected' | 'loading'; services: Service[]; clients: Client[]; appointments: Appointment[]; onClientAdded: (client: Omit<Client, 'id'>) => string; onClientUpdated: (client: Client) => void; onAppointmentFinalized: (data: TempAppointmentData) => void; onAppointmentRescheduled: (id: string, date: string, time: string) => void; onAppointmentCancelled: (id: string) => void; operatingHours: OperatingHours; onConversationFinished: (log: ConversationLog) => void; catalogFiles: { id: string; file: File }[]; monthlyPlans: MonthlyPlan[]; clientPlanUsages: ClientPlanUsage[]; conversationLogs: ConversationLog[]; onConnect: () => void; }) => {
    const [messages, setMessages] = useState<ChatMessageData[]>([]);
    const [isTyping, setIsTyping] = useState(false);
    const [userInput, setUserInput] = useState('');
    const [conversationState, setConversationState] = useState<ConversationState>('GREETING');
    const [tempData, setTempData] = useState<TempAppointmentData>({ serviceIds: [] });
    const [dateSlotOptions, setDateSlotOptions] = useState<{date: Date, slots: string[]}[]>([]);
    const [isConversationFinished, setIsConversationFinished] = useState(false);
    const [activeConversationId, setActiveConversationId] = useState<'live' | string>('live');

    const bottomRef = useRef<HTMLDivElement>(null);

    const addMessage = (sender: 'Cliente' | 'CAR CLASS', content: React.ReactNode) => {
        setMessages(prev => [...prev, { sender, content, isBot: sender === 'CAR CLASS' }]);
    };
    
    const thinkAndRespond = (responseFn: () => void, delay = 1000) => {
        setIsTyping(true);
        setTimeout(() => {
            setIsTyping(false);
            responseFn();
        }, delay);
    };

    const findNextAvailableDays = useCallback((count: number): Date[] => {
        const availableDays: Date[] = [];
        const today = new Date();
        let checkedDay = new Date(today);

        while (availableDays.length < count && checkedDay.getTime() - today.getTime() < 30 * 24 * 60 * 60 * 1000) { // Check up to 30 days
            checkedDay.setDate(checkedDay.getDate() + 1);
            if (operatingHours.daysOpen.includes(checkedDay.getDay())) {
                availableDays.push(new Date(checkedDay));
            }
        }
        return availableDays;
    }, [operatingHours]);
    
    const getAvailableSlots = useCallback((date: Date): string[] => {
        const dateString = date.toISOString().split('T')[0];
        const bookedSlots = appointments
            .filter(app => app.date === dateString && app.status !== AppointmentStatus.Finished)
            .map(app => app.time);
        return operatingHours.availableTimes.filter(hour => !bookedSlots.includes(hour));
    }, [appointments, operatingHours]);

    const startDateTimeSelection = () => {
        const nextDays = findNextAvailableDays(3);
        if (nextDays.length > 0) {
            const daySlotPairs = nextDays
                .map(date => ({ date, slots: getAvailableSlots(date) }))
                .filter(pair => pair.slots.length > 0);

            if (daySlotPairs.length > 0) {
                setDateSlotOptions(daySlotPairs);
                const dateOptions = daySlotPairs.map((pair, index) => {
                    const formattedDate = pair.date.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' });
                    return (
                        <li key={index} className="py-1">
                            <strong>{index + 1}: {formattedDate}</strong>
                            <br />
                            <span className="text-sm text-gray-300">Horários disponíveis: {pair.slots.join(', ')}</span>
                        </li>
                    );
                });
                addMessage('CAR CLASS', <div>
                    <p>Perfeito! Tenho estas próximas datas e horários disponíveis:</p>
                    <ul className="list-none mt-2 space-y-2">{dateOptions}</ul>
                    <p className="mt-2">Por favor, digite o dia e horário (ex: terça 09:00) ou o número correspondente (ex: 1 09:00).</p>
                </div>);
                setConversationState('AWAITING_DATE_AND_TIME_CHOICE');
            } else {
                addMessage('CAR CLASS', <p>Desculpe, não encontramos nenhum horário disponível nos próximos dias. Por favor, entre em contato para agendarmos.</p>);
                setConversationState('FINISHED');
            }
        } else {
            addMessage('CAR CLASS', <p>Desculpe, não encontramos nenhuma data disponível nos próximos dias. Por favor, entre em contato para agendarmos.</p>);
            setConversationState('FINISHED');
        }
    };
    
    const finalizeAppointment = useCallback((finalData: TempAppointmentData) => {
        // Handle rescheduling
        if (finalData.appointmentToChangeId) {
            const appointmentToUpdate = appointments.find(app => app.id === finalData.appointmentToChangeId);
            if (!appointmentToUpdate) {
                addMessage('CAR CLASS', <p>Ocorreu um erro ao encontrar seu agendamento. Por favor, entre em contato conosco.</p>);
                setConversationState('FINISHED');
                return;
            }
            
            const client = clients.find(c => c.id === appointmentToUpdate.clientId);
            const car = client?.cars.find(c => c.id === appointmentToUpdate.carId);
            const serviceNames = appointmentToUpdate.serviceIds
                .map(id => services.find(s => s.id === id)?.name)
                .filter(Boolean)
                .join(' + ');

            onAppointmentRescheduled(finalData.appointmentToChangeId, finalData.date!, finalData.time!);
            
            const dateObj = new Date(finalData.date + 'T00:00:00');
            const formattedDate = dateObj.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long' });
             
             addMessage('CAR CLASS', <div>
                <p>Perfeito! Seu agendamento foi alterado com sucesso. Segue o resumo:</p>
                <ul className="list-disc list-inside mt-2 text-sm space-y-1">
                    {client && <li><strong>Cliente:</strong> {client.name}</li>}
                    {car && <li><strong>Veículo:</strong> {car.model} ({car.plate})</li>}
                    {serviceNames && <li><strong>Serviços:</strong> {serviceNames}</li>}
                    <li><strong>Nova Data:</strong> {formattedDate} às {finalData.time}</li>
                </ul>
                <p className="mt-2">Até lá!</p>
            </div>);
            setConversationState('FINISHED');
            return;
        }

        // Handle new appointment
        const client = clients.find(c => c.id === finalData.clientId);
        let car: Car | undefined;
        if (finalData.carId) { car = client?.cars.find(c => c.id === finalData.carId); } 
        else { car = { id: '', model: finalData.carModel!, plate: finalData.carPlate!, protections: finalData.protections! }; }
        
        if (!client || !car) {
             addMessage('CAR CLASS', <p>Ocorreu um erro ao finalizar. Por favor, tente novamente.</p>);
             setConversationState('FINISHED');
             return;
        }

        const serviceNames = finalData.serviceIds && finalData.serviceIds.length > 0 ? finalData.serviceIds?.map(id => services.find(s => s.id === id)?.name).filter(Boolean).join(' + ') : 'A definir no local';
        const dateObj = new Date(finalData.date + 'T00:00:00');
        const formattedDate = dateObj.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });

        addMessage('CAR CLASS', <div>
            <p>Agendamento confirmado! Segue o resumo:</p>
            <ul className="list-disc list-inside mt-2 text-sm space-y-1">
                <li><strong>Cliente:</strong> {client.name}</li>
                <li><strong>Veículo:</strong> {car.model} ({car.plate})</li>
                <li><strong>Serviços:</strong> {serviceNames}</li>
                <li><strong>Data:</strong> {formattedDate} às {finalData.time}</li>
                {finalData.paymentMethod && <li><strong>Pagamento:</strong> {finalData.paymentMethod}</li>}
            </ul>
            <p className="mt-2">Obrigado pela preferência!</p>
        </div>);
        
        onAppointmentFinalized(finalData);
        setConversationState('FINISHED');
    }, [clients, services, appointments, onAppointmentFinalized, onAppointmentRescheduled]);

    const handleSendMessage = (e: React.FormEvent) => {
        e.preventDefault();
        if (!userInput.trim()) return;
        addMessage('Cliente', <p>{userInput}</p>);
        processUserInput(userInput);
        setUserInput('');
    };
    
    const handleServiceSelectionLogic = async (userInput: string) => {
        setIsTyping(true);

        try {
            const apiResponse = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userInput, services }),
            });

            if (!apiResponse.ok) {
                throw new Error(`API error: ${apiResponse.statusText}`);
            }

            const result = await apiResponse.json();
            
            setIsTyping(false);
            addMessage('CAR CLASS', <p>{result.responseText}</p>);

            if (result.action === 'BOOK_SERVICE' && result.serviceIds && result.serviceIds.length > 0) {
                const validServiceIds = result.serviceIds.filter((id: string) => services.some(s => s.id === id));
                if (validServiceIds.length > 0) {
                    setTempData(prev => ({ ...prev, serviceIds: [...new Set([...(prev.serviceIds || []), ...validServiceIds])] }));
                    thinkAndRespond(startDateTimeSelection, 1500);
                } else {
                     addMessage('CAR CLASS', <p>Peço desculpas, mas não consegui confirmar os serviços que você mencionou em nossa lista. Poderia tentar novamente, por favor?</p>);
                }
            }
            // For 'ANSWER_QUESTION' or 'CLARIFY', we've already sent the response and stay in the same state.

        } catch (error) {
            console.error("Processing error:", error);
            setIsTyping(false);
            addMessage('CAR CLASS', <p>Desculpe, tive um problema para entender sua resposta. Poderia digitar o nome ou código do serviço que deseja?</p>);
        }
    };

    const processUserInput = (input: string) => {
        const normalizedInput = normalizeText(input);

        switch (conversationState) {
            case 'AWAITING_IS_CLIENT_RESPONSE':
                if (normalizedInput.includes('sim') || normalizedInput.includes('sou') || normalizedInput.includes('ja sou')) {
                    thinkAndRespond(() => {
                        addMessage('CAR CLASS', <p>Que ótimo! Para localizar seu cadastro, por favor, digite seu CPF.</p>);
                        setConversationState('AWAITING_CPF');
                    });
                } else if (normalizedInput.includes('nao') || normalizedInput.includes('novo') || normalizedInput.includes('cadastrar')) {
                    thinkAndRespond(() => {
                        addMessage('CAR CLASS', <p>Seja bem-vindo(a)! Para iniciarmos seu cadastro, qual é o seu nome completo?</p>);
                        setConversationState('AWAITING_NEW_CLIENT_NAME');
                    });
                } else {
                     thinkAndRespond(() => addMessage('CAR CLASS', <p>Desculpe, não entendi. Você já é nosso cliente?</p>));
                }
                break;
            case 'AWAITING_CPF':
                if (normalizedInput.includes('cadastrar') || normalizedInput.includes('novo')) {
                    thinkAndRespond(() => {
                        addMessage('CAR CLASS', <p>Entendido. Para iniciarmos seu cadastro, qual é o seu nome completo?</p>);
                        setConversationState('AWAITING_NEW_CLIENT_NAME');
                    });
                    break;
                }

                const cleanCpf = input.replace(/[.-]/g, '');
                const existingClient = clients.find(c => c.cpf.replace(/[.-]/g, '') === cleanCpf);
                
                if (existingClient) {
                    const existingAppointment = appointments.find(app => app.clientId === existingClient.id && app.status !== AppointmentStatus.Finished);
                    setTempData({ clientId: existingClient.id, clientName: existingClient.name, serviceIds: [], appointmentToChangeId: existingAppointment?.id });

                    if (existingAppointment) {
                         const serviceName = services.find(s => s.id === existingAppointment.serviceIds[0])?.name || 'serviço';
                         const dateObj = new Date(existingAppointment.date + 'T00:00:00');
                         const formattedDate = dateObj.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long' });
                        thinkAndRespond(() => {
                            addMessage('CAR CLASS', <p>Olá, {existingClient.name}! Verifiquei que você já tem um agendamento para {serviceName} no dia {formattedDate} às {existingAppointment.time}. Deseja alterar, cancelar ou prosseguir com um novo atendimento?</p>);
                            setConversationState('AWAITING_EXISTING_APPOINTMENT_ACTION');
                        });
                    } else {
                        const clientPlan = monthlyPlans.find(p => p.id === existingClient.monthlyPlanId);
                        if (clientPlan) {
                            const getFirstDayOfCurrentMonth = () => {
                                const now = new Date();
                                return new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
                            };
                            const currentCycleStart = getFirstDayOfCurrentMonth();
                            const usage = clientPlanUsages.find(u => u.clientId === existingClient.id && u.cycleStartDate === currentCycleStart);

                            const remainingServicesText = clientPlan.includedServices.map(item => {
                                const service = services.find(s => s.id === item.serviceId);
                                if (!service) return null;
                                const used = usage?.usedServices[item.serviceId] || 0;
                                const remaining = item.quantity - used;
                                return remaining > 0 ? `${remaining}x ${service.name}` : null;
                            }).filter(Boolean).join(', ');

                            thinkAndRespond(() => {
                                addMessage('CAR CLASS', <div>
                                    <p>Olá, {existingClient.name}! Vi que você é assinante do nosso <strong>{clientPlan.name}</strong>.</p>
                                    {remainingServicesText ?
                                        <p className="mt-2">Este mês você ainda tem disponível: <span className="font-semibold">{remainingServicesText}</span>.</p> :
                                        <p className="mt-2">Você já utilizou todos os serviços do seu plano este mês.</p>
                                    }
                                    <p className="mt-2">Gostaria de agendar um serviço do plano ou ver nosso catálogo para outros serviços?</p>
                                </div>);
                                setConversationState('AWAITING_SERVICE_CHOICE_METHOD');
                            });

                        } else {
                             thinkAndRespond(() => {
                                addMessage('CAR CLASS', <p>Olá, {existingClient.name}! Cadastro localizado. Você possui ou gostaria de conhecer nossos planos mensais?</p>);
                                setConversationState('AWAITING_PLAN_INTEREST');
                            });
                        }
                    }
                } else {
                    thinkAndRespond(() => {
                        addMessage('CAR CLASS', <p>Não localizei um cadastro com este CPF. Por favor, verifique e digite novamente. Se preferir, digite "cadastrar" para criar um novo registro.</p>);
                    });
                }
                break;
            case 'AWAITING_EXISTING_APPOINTMENT_ACTION':
                if (normalizedInput.includes('prosseguir') || normalizedInput.includes('novo') || normalizedInput.includes('outro')) {
                    thinkAndRespond(() => {
                        setTempData(prev => ({...prev, appointmentToChangeId: undefined }));
                        const client = clients.find(c => c.id === tempData.clientId);
                        if (client && !client.monthlyPlanId) {
                             addMessage('CAR CLASS', <p>Entendido. Você possui ou gostaria de conhecer nossos planos mensais?</p>);
                             setConversationState('AWAITING_PLAN_INTEREST');
                        } else {
                            addMessage('CAR CLASS', <p>Entendido. Como podemos ajudar hoje?</p>);
                            setTimeout(() => addMessage('CAR CLASS', <div><p>Você prefere:</p><ul className="list-disc list-inside mt-2 text-sm space-y-1"><li>Ver nossa lista de serviços?</li><li>Escolher o serviço no local?</li></ul></div>), 500);
                            setConversationState('AWAITING_SERVICE_CHOICE_METHOD');
                        }
                    });
                } else if (normalizedInput.includes('alterar') || normalizedInput.includes('mudar') || normalizedInput.includes('reagendar')) {
                     thinkAndRespond(() => {
                        startDateTimeSelection();
                    });
                } else if (normalizedInput.includes('cancelar')) {
                    thinkAndRespond(() => {
                        addMessage('CAR CLASS', <p>Tem certeza que deseja cancelar este agendamento? Esta ação não pode ser desfeita. (Sim/Não)</p>);
                        setConversationState('AWAITING_CANCELLATION_CONFIRMATION');
                    });
                } else {
                    thinkAndRespond(() => addMessage('CAR CLASS', <p>Não entendi. Por favor, responda com "Alterar", "Cancelar" ou "Prosseguir".</p>));
                }
                break;
            case 'AWAITING_CANCELLATION_CONFIRMATION':
                if (normalizedInput.includes('sim') || normalizedInput.includes('confirmo') || normalizedInput.includes('pode cancelar')) {
                    thinkAndRespond(() => {
                        if (tempData.appointmentToChangeId) {
                            onAppointmentCancelled(tempData.appointmentToChangeId);
                            addMessage('CAR CLASS', <p>Seu agendamento foi cancelado com sucesso. Agradecemos o contato e esperamos vê-lo em breve!</p>);
                        } else {
                            addMessage('CAR CLASS', <p>Ocorreu um erro ao tentar cancelar. Por favor, entre em contato conosco.</p>);
                        }
                        setConversationState('FINISHED');
                    });
                } else if (normalizedInput.includes('nao') || normalizedInput.includes('manter')) {
                    thinkAndRespond(() => {
                         const existingAppointment = appointments.find(app => app.id === tempData.appointmentToChangeId);
                         const serviceName = services.find(s => s.id === existingAppointment?.serviceIds[0])?.name || 'serviço';
                         const dateObj = new Date(existingAppointment!.date + 'T00:00:00');
                         const formattedDate = dateObj.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long' });

                        addMessage('CAR CLASS', <p>Ok, seu agendamento para {serviceName} no dia {formattedDate} está mantido. Deseja alterar ou prosseguir com um novo atendimento?</p>);
                        setConversationState('AWAITING_EXISTING_APPOINTMENT_ACTION');
                    });
                } else {
                    thinkAndRespond(() => {
                        addMessage('CAR CLASS', <p>Não entendi sua resposta. Por favor, responda com "Sim" ou "Não".</p>);
                    });
                }
                break;
             case 'AWAITING_NEW_CLIENT_NAME':
                setTempData(prev => ({ ...prev, clientName: input }));
                thinkAndRespond(() => {
                    addMessage('CAR CLASS', <p>Obrigado, {input}. Agora, por favor, digite seu CPF.</p>);
                    setConversationState('AWAITING_NEW_CLIENT_CPF');
                });
                break;
            case 'AWAITING_NEW_CLIENT_CPF':
                const cleanCpfForNewClient = input.replace(/[.-]/g, '');
                const clientAlreadyExists = clients.find(c => c.cpf.replace(/[.-]/g, '') === cleanCpfForNewClient);
            
                if (clientAlreadyExists) {
                    thinkAndRespond(() => {
                        addMessage('CAR CLASS', <p>Verifiquei que já existe um cadastro com este CPF em nome de {clientAlreadyExists.name}. Vamos continuar com ele.</p>);
                    });
            
                    // Use a timeout to ensure the "found you" message appears before the next logical step
                    setTimeout(() => {
                        const existingAppointment = appointments.find(app => app.clientId === clientAlreadyExists.id && app.status !== AppointmentStatus.Finished);
                        setTempData({ clientId: clientAlreadyExists.id, clientName: clientAlreadyExists.name, serviceIds: [], appointmentToChangeId: existingAppointment?.id });
            
                        if (existingAppointment) {
                             const serviceName = services.find(s => s.id === existingAppointment.serviceIds[0])?.name || 'serviço';
                             const dateObj = new Date(existingAppointment.date + 'T00:00:00');
                             const formattedDate = dateObj.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long' });
                            thinkAndRespond(() => {
                                addMessage('CAR CLASS', <p>Verifiquei que você já tem um agendamento para {serviceName} no dia {formattedDate} às {existingAppointment.time}. Deseja alterar, cancelar ou prosseguir com um novo atendimento?</p>);
                                setConversationState('AWAITING_EXISTING_APPOINTMENT_ACTION');
                            });
                        } else {
                            const clientPlan = monthlyPlans.find(p => p.id === clientAlreadyExists.monthlyPlanId);
                            if (clientPlan) {
                                const getFirstDayOfCurrentMonth = () => {
                                    const now = new Date();
                                    return new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
                                };
                                const currentCycleStart = getFirstDayOfCurrentMonth();
                                const usage = clientPlanUsages.find(u => u.clientId === clientAlreadyExists.id && u.cycleStartDate === currentCycleStart);
            
                                const remainingServicesText = clientPlan.includedServices.map(item => {
                                    const service = services.find(s => s.id === item.serviceId);
                                    if (!service) return null;
                                    const used = usage?.usedServices[item.serviceId] || 0;
                                    const remaining = item.quantity - used;
                                    return remaining > 0 ? `${remaining}x ${service.name}` : null;
                                }).filter(Boolean).join(', ');
            
                                thinkAndRespond(() => {
                                    addMessage('CAR CLASS', <div>
                                        <p>Vi que você é assinante do nosso <strong>{clientPlan.name}</strong>.</p>
                                        {remainingServicesText ?
                                            <p className="mt-2">Este mês você ainda tem disponível: <span className="font-semibold">{remainingServicesText}</span>.</p> :
                                            <p className="mt-2">Você já utilizou todos os serviços do seu plano este mês.</p>
                                        }
                                        <p className="mt-2">Gostaria de agendar um serviço do plano ou ver nosso catálogo para outros serviços?</p>
                                    </div>);
                                    setConversationState('AWAITING_SERVICE_CHOICE_METHOD');
                                });
            
                            } else {
                                thinkAndRespond(() => {
                                    addMessage('CAR CLASS', <p>Como podemos ajudar hoje?</p>);
                                    setTimeout(() => addMessage('CAR CLASS', <div><p>Você prefere:</p><ul className="list-disc list-inside mt-2 text-sm space-y-1"><li>Ver nossa lista de serviços?</li><li>Escolher o serviço no local?</li></ul></div>), 500);
                                    setConversationState('AWAITING_SERVICE_CHOICE_METHOD');
                                });
                            }
                        }
                    }, 1500);
                } else {
                     const newClientData = { name: tempData.clientName!, cpf: input, whatsapp: '5511999999999', cars: [] };
                     const newClientId = onClientAdded(newClientData);
                     setTempData(prev => ({ ...prev, clientCpf: input, clientId: newClientId })); 
                     thinkAndRespond(() => {
                        addMessage('CAR CLASS', <p>Cadastro realizado com sucesso! Você gostaria de conhecer nossos planos mensais de cuidados ou prefere ir direto para o agendamento de um serviço avulso?</p>);
                        setConversationState('AWAITING_PLAN_INTEREST');
                    }, 1500);
                }
                break;
            case 'AWAITING_PLAN_INTEREST':
                 if (normalizedInput.includes('sim') || normalizedInput.includes('conhecer') || normalizedInput.includes('plano')) {
                    const planOptions = monthlyPlans.map((plan, index) => (
                        <li key={plan.id}><strong>{index + 1}: {plan.name}</strong> - R${plan.price.toFixed(2)}/mês</li>
                    ));
                    thinkAndRespond(() => {
                        addMessage('CAR CLASS', <div>
                            <p>Que ótimo! Temos os seguintes planos:</p>
                            <ul className="list-none mt-2 space-y-2">{planOptions}</ul>
                            <p className="mt-2">Deseja aderir a algum deles? Se sim, me diga o nome ou número do plano. Se não, basta dizer "não" ou "avulso".</p>
                        </div>);
                        setConversationState('AWAITING_PLAN_SELECTION');
                    });
                } else {
                     thinkAndRespond(() => {
                        addMessage('CAR CLASS', <p>Entendido. Como podemos ajudar com um serviço avulso?</p>);
                        setTimeout(() => addMessage('CAR CLASS', <div><p>Você prefere:</p><ul className="list-disc list-inside mt-2 text-sm space-y-1"><li>Ver nossa lista de serviços?</li><li>Escolher o serviço no local?</li></ul></div>), 500);
                        setConversationState('AWAITING_SERVICE_CHOICE_METHOD');
                    });
                }
                break;
            case 'AWAITING_PLAN_SELECTION':
                let chosenPlan: MonthlyPlan | undefined;
                const planNumber = (input.match(/\d+/) || [])[0];
                if (planNumber) {
                    chosenPlan = monthlyPlans[parseInt(planNumber, 10) - 1];
                } else {
                    chosenPlan = monthlyPlans.find(p => normalizeText(p.name).includes(normalizedInput));
                }

                if (chosenPlan) {
                    const clientToUpdate = clients.find(c => c.id === tempData.clientId);
                    if (clientToUpdate) {
                        onClientUpdated({ ...clientToUpdate, monthlyPlanId: chosenPlan.id });
                        thinkAndRespond(() => {
                            addMessage('CAR CLASS', <p>Excelente! Adicionamos o <strong>{chosenPlan!.name}</strong> ao seu cadastro. Agora, vamos agendar seu primeiro serviço. Como prefere escolher?</p>);
                            setTimeout(() => addMessage('CAR CLASS', <div><p>Você prefere:</p><ul className="list-disc list-inside mt-2 text-sm space-y-1"><li>Ver nossa lista de serviços?</li><li>Escolher o serviço no local?</li></ul></div>), 500);
                            setConversationState('AWAITING_SERVICE_CHOICE_METHOD');
                        });
                    }
                } else {
                    thinkAndRespond(() => {
                        addMessage('CAR CLASS', <p>Ok, vamos prosseguir com um serviço avulso então. Como prefere escolher?</p>);
                        setTimeout(() => addMessage('CAR CLASS', <div><p>Você prefere:</p><ul className="list-disc list-inside mt-2 text-sm space-y-1"><li>Ver nossa lista de serviços?</li><li>Escolher o serviço no local?</li></ul></div>), 500);
                        setConversationState('AWAITING_SERVICE_CHOICE_METHOD');
                    });
                }
                break;
            case 'AWAITING_SERVICE_CHOICE_METHOD':
                if(normalizedInput.includes('lista') || normalizedInput.includes('servicos') || normalizedInput.includes('ver') || normalizedInput.includes('pdf') || normalizedInput.includes('catalogo')) {
                    thinkAndRespond(() => {
                        if (catalogFiles && catalogFiles.length > 0) {
                            addMessage('CAR CLASS', <div>
                                <p>Claro! Aqui estão nossos catálogos de serviços. Dê uma olhada e depois me diga qual ou quais serviços você gostaria de agendar. Se tiver qualquer dúvida, pode perguntar!</p>
                                <div className="mt-2 space-y-2">
                                    {catalogFiles.map(({ id, file }) => {
                                        if (file.type.startsWith('image/')) {
                                            return <ImageAttachment key={id} file={file} />;
                                        } else if (file.type === 'application/pdf') {
                                            return <FileAttachment key={id} fileName={file.name} fileType="pdf" />;
                                        }
                                        return null;
                                    })}
                                </div>
                            </div>);
                            setConversationState('AWAITING_SERVICE_SELECTION');
                        } else {
                            addMessage('CAR CLASS', <p>No momento não temos um catálogo, mas posso te ajudar a escolher. Nossos principais serviços são Lavagem Detalhada, Polimento Técnico e Higienização Interna. Qual te interessa?</p>);
                            setConversationState('AWAITING_SERVICE_SELECTION');
                        }
                    });
                } else if(normalizedInput.includes('local') || normalizedInput.includes('decidir na hora') || normalizedInput.includes('pessoalmente')) {
                    setTempData(prev => ({...prev, serviceIds: [] }));
                    thinkAndRespond(() => {
                        addMessage('CAR CLASS', <p>Sem problemas! Você pode decidir o serviço quando trouxer o veículo.</p>);
                        setTimeout(startDateTimeSelection, 500);
                    });
                } else {
                    handleServiceSelectionLogic(input);
                }
                break;
            case 'AWAITING_SERVICE_SELECTION':
                handleServiceSelectionLogic(input);
                break;
            case 'AWAITING_DATE_AND_TIME_CHOICE':
                const parseDateTimeSelection = (text: string, options: {date: Date, slots: string[]}[]): { date: Date, time: string } | null => {
                    const localNormalizedInput = normalizeText(text);

                    // Try numeric format first (e.g., "1 14:00")
                    const numericMatch = localNormalizedInput.match(/^(\d+)\s+(\d{1,2}:\d{2})$/);
                    if (numericMatch) {
                        const dateIndex = parseInt(numericMatch[1], 10) - 1;
                        const time = numericMatch[2];
                        if (options[dateIndex] && options[dateIndex].slots.includes(time)) {
                            return { date: options[dateIndex].date, time };
                        }
                    }
                    
                    // Try natural language
                    const dayMap: Record<string, number> = { 'domingo': 0, 'segunda': 1, 'terca': 2, 'quarta': 3, 'quinta': 4, 'sexta': 5, 'sabado': 6 };
                    let foundDayIndex = -1;
                    for (const dayName in dayMap) {
                        if (localNormalizedInput.includes(dayName)) {
                            foundDayIndex = dayMap[dayName];
                            break;
                        }
                    }

                    const numberWords: Record<string, number> = {
                        'uma': 1, 'um': 1, 'duas': 2, 'dois': 2, 'tres': 3, 'quatro': 4, 'cinco': 5,
                        'seis': 6, 'sete': 7, 'oito': 8, 'nove': 9, 'dez': 10, 'onze': 11, 'doze': 12,
                        'treze': 13, 'catorze': 14, 'quatorze': 14, 'quinze': 15, 'dezesseis': 16,
                        'dezessete': 17, 'dezoito': 18, 'dezenove': 19, 'vinte': 20
                    };

                    let hour: number | null = null;
                    let minute = 0;

                    // Check for written out numbers
                    for (const word in numberWords) {
                        if (localNormalizedInput.includes(word)) {
                            hour = numberWords[word];
                            break;
                        }
                    }

                    // Check for digits if no word was found
                    if (hour === null) {
                        const timeMatch = localNormalizedInput.match(/(\d{1,2})(?::(\d{2}))?/);
                        if (timeMatch) {
                            hour = parseInt(timeMatch[1], 10);
                            if(timeMatch[2]) {
                                minute = parseInt(timeMatch[2], 10);
                            }
                        }
                    }
                    
                    // If we still have no hour or day, we can't proceed
                    if (hour === null || foundDayIndex === -1) {
                        return null;
                    }

                    // Adjust for AM/PM context
                    const isTarde = localNormalizedInput.includes('tarde');
                    const isNoite = localNormalizedInput.includes('noite');
                    const isManha = localNormalizedInput.includes('manha');

                    if ((isTarde || isNoite) && hour < 12) {
                        hour += 12;
                    } else if (!isManha && hour >= 1 && hour <= 7) { 
                        // Heuristic for single-digit hours without context, assume PM for a business
                        // e.g. "as quatro" -> 16:00
                        hour += 12;
                    }

                    const formatTwoDigits = (n: number) => n.toString().padStart(2, '0');
                    const targetTime = `${formatTwoDigits(hour)}:${formatTwoDigits(minute)}`;
                    
                    const matchingOption = options.find(opt => opt.date.getDay() === foundDayIndex);

                    if (matchingOption && matchingOption.slots.includes(targetTime)) {
                        return { date: matchingOption.date, time: targetTime };
                    }
                    
                    // Fallback for cases like "quinta 16:00" that might be missed by the complex logic above
                    const fallbackTimeMatch = localNormalizedInput.match(/(\d{1,2}:\d{2})/);
                    if(fallbackTimeMatch) {
                        const fallbackTime = fallbackTimeMatch[1];
                        if (matchingOption && matchingOption.slots.includes(fallbackTime)) {
                            return { date: matchingOption.date, time: fallbackTime };
                        }
                    }

                    return null;
                };

                const selection = parseDateTimeSelection(input, dateSlotOptions);

                if (selection) {
                    const { date: chosenDate, time: chosenTime } = selection;
                    const newTempData = { ...tempData, date: chosenDate.toISOString().split('T')[0], time: chosenTime };
                    setTempData(newTempData);

                    if (newTempData.appointmentToChangeId) {
                         thinkAndRespond(() => {
                            addMessage('CAR CLASS', <p>Para confirmar, qual será a forma de pagamento? (PIX, Cartão de Crédito, Débito, Dinheiro)</p>);
                            setConversationState('AWAITING_PAYMENT_METHOD');
                        });
                        return;
                    }
                    
                    const client = clients.find(c => c.id === newTempData.clientId);
                    if (client && client.cars.length > 0) {
                        thinkAndRespond(() => {
                            if (client.cars.length === 1) {
                                const car = client.cars[0];
                                addMessage('CAR CLASS', <p>Perfeito. O serviço será para o seu {car.model} (Placa: {car.plate})? (Sim/Cadastrar Outro)</p>);
                            } else {
                                addMessage('CAR CLASS', <div>
                                    <p>Para qual dos seus veículos é o serviço?</p>
                                    <ul className="list-disc list-inside mt-2 text-sm space-y-1">
                                        {client.cars.map((car, index) => <li key={car.id}><strong>{index + 1}:</strong> {car.model} ({car.plate})</li>)}
                                        <li><strong>{client.cars.length + 1}:</strong> Cadastrar outro veículo</li>
                                    </ul>
                                </div>);
                            }
                            setConversationState('AWAITING_VEHICLE_CONFIRMATION');
                        });
                    } else {
                        thinkAndRespond(() => {
                            addMessage('CAR CLASS', <p>Perfeito! Para finalizar, qual o modelo do seu veículo?</p>);
                            setConversationState('AWAITING_NEW_VEHICLE_MODEL');
                        });
                    }
                } else {
                    thinkAndRespond(() => addMessage('CAR CLASS', <p>Não consegui entender a data e horário. Por favor, tente novamente no formato "dia da semana e hora" (ex: terça 14:00) ou "número e hora" (ex: 2 14:00).</p>));
                }
                break;
            case 'AWAITING_VEHICLE_CONFIRMATION':
                const currentClient = clients.find(c => c.id === tempData.clientId);
                if (!currentClient) return;

                const proceedToPayment = (finalData: TempAppointmentData) => {
                    setTempData(finalData);
                    thinkAndRespond(() => {
                        addMessage('CAR CLASS', <p>Para confirmar, qual será a forma de pagamento? (PIX, Cartão de Crédito, Débito, Dinheiro)</p>);
                        setConversationState('AWAITING_PAYMENT_METHOD');
                    }, 500);
                }

                if (normalizedInput.includes('cadastrar') || normalizedInput.includes('outro') || normalizedInput.includes('novo')) {
                    thinkAndRespond(() => {
                        addMessage('CAR CLASS', <p>Entendido. Qual o modelo do novo veículo?</p>);
                        setConversationState('AWAITING_NEW_VEHICLE_MODEL');
                    });
                    return;
                }

                // Case for a single car
                if (currentClient.cars.length === 1 && (normalizedInput.includes('sim') || normalizedInput.includes('esse') || normalizedInput.includes('isso') || normalizedInput.includes('confirmado'))) {
                    const selectedCar = currentClient.cars[0];
                    proceedToPayment({ ...tempData, carId: selectedCar.id });
                    return;
                }

                // Case for multiple cars
                if (currentClient.cars.length > 1) {
                    let selectedCar: Car | null = null;
                    let carIndex = -1;
                    
                    const choiceNumber = (input.match(/\d+/) || [])[0];
                    if (choiceNumber) carIndex = parseInt(choiceNumber, 10) - 1;
                    else if (normalizedInput.includes('primeiro')) carIndex = 0;
                    else if (normalizedInput.includes('segundo')) carIndex = 1;
                    else if (normalizedInput.includes('terceiro')) carIndex = 2;

                    if (carIndex !== -1 && currentClient.cars[carIndex]) {
                        selectedCar = currentClient.cars[carIndex];
                    } else {
                        selectedCar = currentClient.cars.find(car =>
                            normalizedInput.includes(normalizeText(car.model)) || normalizedInput.includes(normalizeText(car.plate).replace('-', ''))
                        ) || null;
                    }

                    if (selectedCar) {
                       proceedToPayment({ ...tempData, carId: selectedCar.id });
                    } else {
                        thinkAndRespond(() => {
                            addMessage('CAR CLASS', <p>Não consegui identificar o veículo. Por favor, escolha um número da lista, o modelo, a placa ou digite "cadastrar outro".</p>);
                        });
                    }
                } else {
                    thinkAndRespond(() => { addMessage('CAR CLASS', <p>Opção inválida. Por favor, responda com "Sim" ou "Cadastrar Outro".</p>); });
                }
                break;
            case 'AWAITING_NEW_VEHICLE_MODEL':
                setTempData(prev => ({...prev, carModel: input}));
                thinkAndRespond(() => {
                    addMessage('CAR CLASS', <p>E qual a placa?</p>);
                    setConversationState('AWAITING_NEW_VEHICLE_PLATE');
                });
                break;
             case 'AWAITING_NEW_VEHICLE_PLATE':
                setTempData(prev => ({...prev, carPlate: input}));
                thinkAndRespond(() => {
                     addMessage('CAR CLASS', <p>Ótimo. Agora, uma pergunta importante: seu veículo possui alguma proteção especial como PPF ou vitrificação? (Sim/Não)</p>);
                     setConversationState('AWAITING_NEW_VEHICLE_PROTECTION_INFO');
                });
                break;
            case 'AWAITING_NEW_VEHICLE_PROTECTION_INFO':
                if (normalizedInput.includes('sim')) {
                     thinkAndRespond(() => {
                        addMessage('CAR CLASS', <p>Entendido. Por favor, diga qual ou quais proteções ele possui.</p>);
                        setConversationState('AWAITING_NEW_VEHICLE_PROTECTION_DETAILS');
                    });
                } else {
                     const finalData = { ...tempData, protections: [] };
                     setTempData(finalData);
                     thinkAndRespond(() => {
                        addMessage('CAR CLASS', <p>Para confirmar, qual será a forma de pagamento? (PIX, Cartão de Crédito, Débito, Dinheiro)</p>);
                        setConversationState('AWAITING_PAYMENT_METHOD');
                    }, 500);
                }
                break;
            case 'AWAITING_NEW_VEHICLE_PROTECTION_DETAILS':
                const protections = input.split(',').map(p => p.trim());
                const finalData = { ...tempData, protections };
                setTempData(finalData);
                 thinkAndRespond(() => {
                    addMessage('CAR CLASS', <p>Para confirmar, qual será a forma de pagamento? (PIX, Cartão de Crédito, Débito, Dinheiro)</p>);
                    setConversationState('AWAITING_PAYMENT_METHOD');
                }, 500);
                break;
             case 'AWAITING_PAYMENT_METHOD':
                let paymentMethod: Appointment['paymentMethod'] | undefined;
                if (normalizedInput.includes('pix')) paymentMethod = 'PIX';
                else if (normalizedInput.includes('credito')) paymentMethod = 'Cartão de Crédito';
                else if (normalizedInput.includes('debito')) paymentMethod = 'Cartão de Débito';
                else if (normalizedInput.includes('dinheiro')) paymentMethod = 'Dinheiro';

                if (paymentMethod) {
                    const finalData = { ...tempData, paymentMethod };
                    setTempData(finalData);
                    thinkAndRespond(() => finalizeAppointment(finalData), 500);
                } else {
                    thinkAndRespond(() => {
                        addMessage('CAR CLASS', <p>Forma de pagamento não reconhecida. Por favor, escolha entre PIX, Cartão de Crédito, Débito ou Dinheiro.</p>);
                    });
                }
                break;
            default:
                 addMessage('CAR CLASS', <p>Obrigado! Se precisar de algo mais, é só chamar.</p>);
                 setConversationState('FINISHED');
        }
    }
    
    useEffect(() => {
        if (conversationState === 'FINISHED' && !isConversationFinished) {
            const finalMessages = [...messages];
             // The last user message that triggered this state change isn't in `messages` yet
            if(userInput) finalMessages.push({ sender: 'Cliente', isBot: false, content: <p>{userInput}</p>});

            onConversationFinished({
                id: `conv-${Date.now()}`,
                clientId: tempData.clientId || 'unknown',
                timestamp: new Date(),
                messages: finalMessages,
            });
            setIsConversationFinished(true);
        }
    }, [conversationState, messages, userInput, onConversationFinished, isConversationFinished, tempData.clientId]);

    const handleResetConversation = () => {
        setMessages([]);
        setIsTyping(false);
        setConversationState('GREETING');
        setTempData({ serviceIds: [] });
        setIsConversationFinished(false);
        setActiveConversationId('live');
        
        thinkAndRespond(() => {
            addMessage('CAR CLASS', <p>Olá! Bem-vindo à <span className="font-bold">CAR CLASS</span>. Você já é nosso cliente? (Sim/Não)</p>);
            setConversationState('AWAITING_IS_CLIENT_RESPONSE');
        }, 500);
    };


    useEffect(() => {
        if (status === 'connected' && messages.length === 0) {
            handleResetConversation();
        } else if (status === 'disconnected') {
            setMessages([]);
            setConversationState('GREETING');
            setIsConversationFinished(false);
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [status]);
    
    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, isTyping]);

    const commonButtonClasses = "p-3 rounded-md text-white disabled:bg-gray-500 disabled:cursor-not-allowed";
    const commonInputDisabledState = conversationState === 'FINISHED' || isTyping || status !== 'connected' || isConversationFinished;
    
    const sortedConversationLogs = useMemo(() => {
        return [...conversationLogs].sort((a,b) => b.timestamp.getTime() - a.timestamp.getTime());
    }, [conversationLogs]);

    return (
        <div className="h-full flex flex-col">
            <div className="p-4 pb-0">
                <WhatsAppConnectionStatus status={status} />
            </div>
            
            {status === 'connected' ? (
                <div className="flex-grow flex overflow-hidden p-4 pt-0">
                    {/* Sidebar */}
                    <div className="w-1/3 max-w-sm bg-brand-gray-medium rounded-l-lg border-r border-white/10 flex flex-col">
                        <div className="p-2 border-b border-white/10">
                            <button 
                                onClick={handleResetConversation}
                                className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-3 rounded-md text-sm transition-colors"
                            >
                                <PlusIcon className="w-5 h-5"/> Nova Conversa
                            </button>
                        </div>
                        <div className="overflow-y-auto flex-grow">
                             {sortedConversationLogs.length > 0 ? (
                                sortedConversationLogs.map(log => {
                                const client = clients.find(c => c.id === log.clientId);
                                return (
                                    <div 
                                        key={log.id} 
                                        onClick={() => setActiveConversationId(log.id)}
                                        className={`flex items-center gap-3 p-3 cursor-pointer border-l-4 transition-colors ${activeConversationId === log.id ? 'bg-brand-red/20 border-brand-red' : 'border-transparent hover:bg-white/5'}`}
                                    >
                                        <UserCircleIcon className="w-10 h-10 text-gray-400 flex-shrink-0" />
                                        <div className="flex-grow overflow-hidden">
                                            <div className="flex justify-between items-baseline">
                                                <p className="font-bold text-white truncate">{client?.name || 'Cliente Desconhecido'}</p>
                                                <p className="text-xs text-gray-500 flex-shrink-0 ml-2">{new Date(log.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</p>
                                            </div>
                                            <p className="text-sm text-gray-400 truncate">Histórico de conversa</p>
                                        </div>
                                    </div>
                                );
                            })
                            ) : (
                                 <div className="text-center p-4 text-gray-500 text-sm">Nenhuma conversa arquivada.</div>
                            )}
                        </div>
                    </div>

                    {/* Main Chat Panel */}
                    <div className="flex-1 flex flex-col bg-brand-gray-dark rounded-r-lg">
                        {activeConversationId === 'live' ? (
                            <>
                                <div className="p-4 space-y-6 flex-grow overflow-y-auto">
                                    {messages.map((msg, index) => (
                                        <ChatMessage key={index} sender={msg.sender} isBot={msg.isBot}>{msg.content}</ChatMessage>
                                    ))}
                                    {isTyping && <ChatMessage sender="CAR CLASS" isBot isTyping />}
                                    <div ref={bottomRef} />
                                </div>
                                <div className="p-4 border-t border-white/10">
                                {isConversationFinished ? (
                                    <button onClick={handleResetConversation} className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-md transition-colors">
                                        <ArrowPathIcon className="w-5 h-5"/> Iniciar Nova Conversa
                                    </button>
                                ) : (
                                    <form onSubmit={handleSendMessage} className="flex gap-2">
                                        <input 
                                            type="text" 
                                            value={userInput}
                                            onChange={e => setUserInput(e.target.value)}
                                            placeholder={conversationState === 'FINISHED' ? "Conversa finalizada" : "Digite sua mensagem..."}
                                            className="w-full bg-brand-gray-light border border-brand-gray-light text-white rounded-md p-2 focus:ring-brand-red focus:border-brand-red disabled:opacity-50"
                                            disabled={commonInputDisabledState}
                                        />
                                        <button type="submit" className={`${commonButtonClasses} bg-brand-red hover:bg-red-700`} disabled={commonInputDisabledState}>
                                            <PaperAirplaneIcon className="w-5 h-5" />
                                        </button>
                                    </form>
                                )}
                                </div>
                            </>
                        ) : (
                            (() => {
                                const log = conversationLogs.find(l => l.id === activeConversationId);
                                if (!log) return <div className="flex items-center justify-center h-full text-gray-500">Conversa não encontrada.</div>;
                                return (
                                     <div className="p-4 space-y-6 flex-grow overflow-y-auto">
                                        {log.messages.map((msg, index) => (
                                            <ChatMessage key={index} sender={msg.sender} isBot={msg.isBot}>{msg.content}</ChatMessage>
                                        ))}
                                    </div>
                                );
                            })()
                        )}
                    </div>
                </div>
            ) : status === 'disconnected' ? (
                <div className="flex-grow flex flex-col items-center justify-center text-center p-4">
                    <ChatBubbleOvalLeftEllipsisIcon className="w-16 h-16 text-gray-500 mb-4"/>
                    <h3 className="text-xl font-bold text-white">Conecte-se ao WhatsApp</h3>
                    <p className="text-gray-400 mt-2 max-w-md mb-6">Inicie o serviço de atendimento 24/7 para visualizar e gerenciar as conversas com os clientes.</p>
                    <button onClick={onConnect} className="bg-green-600 hover:bg-green-500 text-white font-bold py-3 px-6 rounded-md flex items-center gap-2 text-lg">
                        <PhoneIcon className="w-6 h-6"/> Conectar
                    </button>
                </div>
            ) : ( // loading
                 <div className="flex-grow flex flex-col items-center justify-center text-center p-4 animate-pulse">
                    <QrCodeIcon className="w-48 h-48 text-white mb-4"/>
                    <h3 className="text-xl font-bold text-white">Aguardando Conexão</h3>
                    <p className="text-gray-400 mt-2 max-w-md">Abra o WhatsApp em seu celular e escaneie o QR Code que aparecerá no terminal do seu servidor (Render).</p>
                    <p className="text-yellow-400 mt-4 text-sm">O sistema conectará automaticamente em alguns segundos...</p>
                </div>
            )}
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
    operatingHours,
    automatedMessages,
    monthlyPlans,
    services,
    credentials,
    onSave,
    onFileUpload,
    catalogFiles,
    isProcessingFile,
    onFileDelete,
}: {
    operatingHours: OperatingHours;
    automatedMessages: AutomatedMessage[];
    monthlyPlans: MonthlyPlan[];
    services: Service[];
    credentials: { login: string; password: string };
    onSave: (settings: { operatingHours: OperatingHours, automatedMessages: AutomatedMessage[], monthlyPlans: MonthlyPlan[], credentials: { login: string; password: string; } }) => void;
    onFileUpload: (files: File[]) => void;
    catalogFiles: { id: string; file: File }[];
    isProcessingFile: boolean;
    onFileDelete: (fileId: string) => void;
}) => {
    const [localOperatingHours, setLocalOperatingHours] = useState<OperatingHours>(operatingHours);
    const [localMessages, setLocalMessages] = useState<AutomatedMessage[]>(automatedMessages);
    const [localPlans, setLocalPlans] = useState<MonthlyPlan[]>(monthlyPlans);
    const [localCredentials, setLocalCredentials] = useState(credentials);
    const [newTime, setNewTime] = useState('');
    const [editingMessage, setEditingMessage] = useState<AutomatedMessage | 'new' | null>(null);
    const [editingPlan, setEditingPlan] = useState<MonthlyPlan | 'new' | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            onFileUpload(Array.from(e.target.files));
        }
    };

    const handleCredentialsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setLocalCredentials(prev => ({ ...prev, [name]: value }));
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
            credentials: localCredentials,
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
             <div className="bg-brand-gray-medium p-4 rounded-lg border border-white/10">
                <h3 className="text-xl font-bold text-brand-red mb-4">Acesso ao Sistema</h3>
                <div className="space-y-4">
                    <FormInput label="Usuário (Login)" name="login" value={localCredentials.login} onChange={handleCredentialsChange} placeholder="Ex: admin" />
                    <FormInput label="Senha" name="password" type="password" value={localCredentials.password} onChange={handleCredentialsChange} placeholder="••••••••" />
                </div>
            </div>

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
    const getRevenue = (apps: Appointment[]) => apps
        .flatMap(a => a.serviceIds.map(serviceId => services.find(s => s.id === serviceId)?.price || 0))
        .reduce((sum, price) => sum + price, 0);

    const dailyRevenue = useMemo(() => {
        const todayStr = getToday();
        const todaysAppointments = appointments.filter(a => a.status === AppointmentStatus.Finished && a.date === todayStr);
        return getRevenue(todaysAppointments);
    }, [appointments, services]);

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
    }, [appointments, services]);

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
        
        // Fix: Correctly handle the paymentMethod type before saving.
        // An empty string from the form is converted to `undefined`, and a valid value is cast to the correct type.
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
                // Update quantity or remove if quantity is 0
                return { ...prev, includedServices: quantity > 0 ? prev.includedServices.map(s => s.serviceId === serviceId ? { ...s, quantity } : s) : prev.includedServices.filter(s => s.serviceId !== serviceId) };
            } else if (quantity > 0) {
                // Add new service
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
    onLogin: (login: string, password: string) => void;
    error: string;
};

const LoginView: React.FC<LoginViewProps> = ({ onLogin, error }) => {
    const [login, setLogin] = useState('');
    const [password, setPassword] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onLogin(login, password);
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
                            id="login"
                            name="login"
                            type="text"
                            value={login}
                            onChange={e => setLogin(e.target.value)}
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


const App = () => {
    const [clients, setClients] = useState<Client[]>(MOCK_CLIENTS);
    const [services, setServices] = useState<Service[]>(MOCK_SERVICES);
    const [appointments, setAppointments] = useState<Appointment[]>(MOCK_APPOINTMENTS);
    const [monthlyPlans, setMonthlyPlans] = useState<MonthlyPlan[]>(MOCK_PLANS);
    const [clientPlanUsages, setClientPlanUsages] = useState<ClientPlanUsage[]>(MOCK_CLIENT_PLAN_USAGE);
    const [notifications, setNotifications] = useState<NotificationItem[]>([]);
    const [conversationLogs, setConversationLogs] = useState<ConversationLog[]>([]);
    const [isProcessingFile, setIsProcessingFile] = useState(false);
    
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [loginError, setLoginError] = useState('');
    const [credentials, setCredentials] = useState({ login: 'admin', password: '' });

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
    
    const [catalogFiles, setCatalogFiles] = useState<{ id: string; file: File }[]>([]);
    
    const [whatsAppStatus, setWhatsAppStatus] = useState<'connected' | 'disconnected' | 'loading'>(
        () => (localStorage.getItem('whatsappStatus') as 'connected' | null) || 'disconnected'
    );

    useEffect(() => {
        if (whatsAppStatus !== 'loading') { // prevent saving 'loading' state on reload
            localStorage.setItem('whatsappStatus', whatsAppStatus);
        }
    }, [whatsAppStatus]);


    const addNotification = (message: string, type: 'success' | 'error' = 'success') => {
         const newNotif: NotificationItem = { id: `notif-${Date.now()}`, message, timestamp: new Date(), read: false };
         setNotifications(prev => [newNotif, ...prev]);
         // In a real app, you might have different visuals for success/error
    };
    
    const handleClientSave = (clientData: Omit<Client, 'id'> & { id?: string }) => {
         if (clientData.id) {
             setClients(prev => prev.map(c => c.id === clientData.id ? { ...c, ...clientData } as Client : c));
             addNotification(`Cliente "${clientData.name}" atualizado com sucesso.`);
         } else {
             const newClient = { ...clientData, id: `c${Date.now()}`, cars: clientData.cars || [] } as Client;
             setClients(prev => [...prev, newClient]);
             addNotification(`Novo cliente "${clientData.name}" adicionado.`);
         }
         setIsClientModalOpen(false);
         setEditingClient(null);
    };

    const handleClientDelete = (id: string) => {
         if (window.confirm('Tem certeza que deseja excluir este cliente e todos os seus dados?')) {
             const clientName = clients.find(c => c.id === id)?.name;
             setClients(prev => prev.filter(c => c.id !== id));
             addNotification(`Cliente "${clientName}" excluído.`);
         }
    };
    
    const handleAppointmentSave = (appointmentData: Omit<Appointment, 'id'> & { id?: string }) => {
        if (appointmentData.id) {
             setAppointments(prev => prev.map(a => a.id === appointmentData.id ? { ...a, ...appointmentData } as Appointment : a));
             addNotification(`Agendamento atualizado.`);
        } else {
            const newAppointment: Appointment = { ...appointmentData, id: `a${Date.now()}`};
            setAppointments(prev => [...prev, newAppointment]);
            addNotification(`Novo agendamento criado.`);
        }
        setIsAppointmentModalOpen(false);
        setEditingAppointment(null);
    };
    
    const handleAppointmentDelete = (id: string) => {
         if (window.confirm('Tem certeza que deseja excluir este agendamento?')) {
             setAppointments(prev => prev.filter(a => a.id !== id));
             addNotification(`Agendamento excluído.`);
         }
    };

    const handleServiceSave = (serviceData: Omit<Service, 'id'> & { id?: string }) => {
        if (serviceData.id) {
            setServices(prev => prev.map(s => s.id === serviceData.id ? { ...s, ...serviceData } as Service : s));
            addNotification(`Serviço "${serviceData.name}" atualizado com sucesso.`);
        } else {
            const newService = { ...serviceData, id: `s${Date.now()}` } as Service;
            setServices(prev => [...prev, newService]);
            addNotification(`Novo serviço "${serviceData.name}" adicionado.`);
        }
        setIsServiceModalOpen(false);
        setEditingService(null);
    };

    const handleServiceDelete = (id: string) => {
        if (window.confirm('Tem certeza que deseja excluir este serviço? Ele pode estar associado a agendamentos e planos.')) {
            const serviceName = services.find(s => s.id === id)?.name;
            setServices(prev => prev.filter(s => s.id !== id));
            addNotification(`Serviço "${serviceName}" excluído.`);
        }
    };

    const handleFileUpload = async (files: File[]) => {
        const validFiles = files.filter(file => ['application/pdf', 'image/jpeg', 'image/jpg'].includes(file.type));
    
        if (validFiles.length === 0) {
            addNotification("Nenhum arquivo válido selecionado (somente PDF ou JPG).", 'error');
            return;
        }
        
        setIsProcessingFile(true);
        addNotification(`Processando ${validFiles.length} arquivo(s)...`);
    
        const allExtractedServices: Service[] = [];
        let filesProcessed = 0;
        let successfulFiles: { id: string; file: File }[] = [];
    
        for (const [index, file] of validFiles.entries()) {
            try {
                const fileId = `file-${Date.now()}-${index}`;
                const formData = new FormData();
                formData.append('catalogFile', file);

                const response = await fetch('/api/process-catalog', {
                    method: 'POST',
                    body: formData,
                });

                if (!response.ok) {
                    throw new Error(`Failed to process ${file.name}: ${await response.text()}`);
                }

                const extractedServicesFromFile = await response.json();
    
                const newServicesFromFile: Service[] = extractedServicesFromFile.map((s: any, serviceIndex: number) => ({
                    ...s,
                    id: `s-gen-${fileId}-${serviceIndex}`,
                    sourceFileId: fileId,
                }));
                
                allExtractedServices.push(...newServicesFromFile);
                filesProcessed++;
                successfulFiles.push({ id: fileId, file });
    
            } catch (error) {
                console.error(`Error processing file ${file.name}:`, error);
                addNotification(`Ocorreu um erro ao processar o arquivo "${file.name}".`, 'error');
            }
        }
    
        if (allExtractedServices.length > 0) {
            setServices(prev => [...prev, ...allExtractedServices]);
            setCatalogFiles(prev => [...prev, ...successfulFiles]);
            addNotification(`Processamento concluído! ${filesProcessed}/${validFiles.length} arquivos processados. ${allExtractedServices.length} novos serviços foram adicionados.`);
        } else if (filesProcessed === 0) {
            addNotification("Nenhum serviço pôde ser extraído dos arquivos.", 'error');
        }
    
        setIsProcessingFile(false);
    };

    const handleFileDelete = (fileIdToDelete: string) => {
        if (window.confirm('Tem certeza que deseja excluir este arquivo? Todos os serviços extraídos dele também serão removidos.')) {
            const fileName = catalogFiles.find(f => f.id === fileIdToDelete)?.file.name;
            setCatalogFiles(prev => prev.filter(f => f.id !== fileIdToDelete));
            setServices(prev => prev.filter(s => s.sourceFileId !== fileIdToDelete));
            addNotification(`Arquivo "${fileName}" e seus serviços foram removidos.`);
        }
    };
    
    const handleConnectWhatsApp = () => {
        setWhatsAppStatus('loading');
        // Simulate waiting for QR code scan in server logs
        setTimeout(() => {
            setWhatsAppStatus('connected');
            addNotification('WhatsApp conectado com sucesso!');
        }, 15000); // 15 seconds for user to "scan"
    };

    const handleStartService = (id: string) => {
         setAppointments(prev => prev.map(app => app.id === id ? { ...app, status: AppointmentStatus.InProgress } : app));
    };

    const handleFinishService = (id: string) => {
         const app = appointments.find(a => a.id === id);
         if(!app) return;
         
         const client = clients.find(c => c.id === app.clientId);
         const plan = monthlyPlans.find(p => p.id === client?.monthlyPlanId);
         
         if (client && plan && app.isPlanService) {
             const getFirstDayOfCurrentMonth = () => {
                const now = new Date();
                return new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
            };
            const currentCycleStart = getFirstDayOfCurrentMonth();

            setClientPlanUsages(prev => {
                const usageIndex = prev.findIndex(u => u.clientId === client.id && u.cycleStartDate === currentCycleStart);
                let newUsages = [...prev];

                if (usageIndex > -1) {
                    const updatedUsage = { ...newUsages[usageIndex] };
                    app.serviceIds.forEach(serviceId => {
                        if (plan.includedServices.some(s => s.serviceId === serviceId)) {
                            updatedUsage.usedServices[serviceId] = (updatedUsage.usedServices[serviceId] || 0) + 1;
                        }
                    });
                    newUsages[usageIndex] = updatedUsage;
                } else {
                    const newUsage: ClientPlanUsage = { clientId: client.id, cycleStartDate: currentCycleStart, usedServices: {} };
                    app.serviceIds.forEach(serviceId => {
                         if (plan.includedServices.some(s => s.serviceId === serviceId)) {
                             newUsage.usedServices[serviceId] = 1;
                         }
                    });
                    newUsages.push(newUsage);
                }
                return newUsages;
            });
         }
         
         setAppointments(prev => prev.map(a => a.id === id ? { ...a, status: AppointmentStatus.Finished } : a));
         if (client) addNotification(`Serviço finalizado para ${client.name}. Cliente notificado.`);
    };
    
     const handleAddClientFromWhatsApp = (clientData: Omit<Client, 'id'>) => {
         const newClient = { ...clientData, id: `c${Date.now()}` } as Client;
         setClients(prev => [...prev, newClient]);
         addNotification(`Novo cliente "${clientData.name}" adicionado via WhatsApp.`);
         return newClient.id;
     };
     
    const handleUpdateClientFromWhatsApp = (clientData: Client) => {
        setClients(prev => prev.map(c => c.id === clientData.id ? clientData : c));
        addNotification(`Plano do cliente "${clientData.name}" atualizado via WhatsApp.`);
    };
    
     const handleFinalizeAppointmentFromWhatsApp = (data: TempAppointmentData) => {
         if (!data.clientId || !data.date || !data.time) return;

         // Check if car needs to be added
         let carId = data.carId;
         if (!carId && data.carModel && data.carPlate && data.clientId) {
             const newCar: Car = { id: `car${Date.now()}`, model: data.carModel, plate: data.carPlate, protections: data.protections || [] };
             setClients(prevClients => prevClients.map(c => c.id === data.clientId ? {...c, cars: [...c.cars, newCar]} : c));
             carId = newCar.id;
         }
         
         if (!carId) return; // Should not happen
         
        const client = clients.find(c => c.id === data.clientId);
        const plan = monthlyPlans.find(p => p.id === client?.monthlyPlanId);
        const isAnyServiceInPlan = data.serviceIds?.some(sid => plan?.includedServices.some(is => is.serviceId === sid)) || false;

         const newAppointment: Appointment = {
             id: `a${Date.now()}`,
             clientId: data.clientId,
             carId: carId,
             serviceIds: data.serviceIds || [],
             date: data.date,
             time: data.time,
             status: AppointmentStatus.Scheduled,
             isPlanService: isAnyServiceInPlan,
             paymentMethod: data.paymentMethod,
         };
         setAppointments(prev => [...prev, newAppointment]);
         addNotification(`Novo agendamento criado via WhatsApp.`);
     };
     
     const handleRescheduleAppointmentFromWhatsApp = (id: string, date: string, time: string) => {
         setAppointments(prev => prev.map(app => app.id === id ? { ...app, date, time } : app));
         addNotification(`Agendamento ${id} reagendado via WhatsApp.`);
     };
     
     const handleCancelAppointmentFromWhatsApp = (id: string) => {
         setAppointments(prev => prev.filter(app => app.id !== id));
         addNotification(`Agendamento ${id} cancelado via WhatsApp.`);
     };
     
     const handleSaveSettings = (settings: { operatingHours: OperatingHours, automatedMessages: AutomatedMessage[], monthlyPlans: MonthlyPlan[], credentials: { login: string; password: string; } }) => {
         setOperatingHours(settings.operatingHours);
         setAutomatedMessages(settings.automatedMessages);
         setMonthlyPlans(settings.monthlyPlans);
         setCredentials(settings.credentials);
         addNotification("Configurações salvas com sucesso!");
     };
     
     const handleNewConversation = (log: ConversationLog) => {
         setConversationLogs(prev => [log, ...prev]);
     };
    
    const handleLogin = (loginAttempt: string, passwordAttempt: string) => {
        if (loginAttempt === credentials.login && passwordAttempt === credentials.password) {
            setIsAuthenticated(true);
            setLoginError('');
        } else {
            setLoginError('Usuário ou senha inválidos.');
        }
    };
    
    const handleLogout = () => {
        setIsAuthenticated(false);
    };

    const TabButton = ({ id, icon, label }: { id: string, icon: React.ReactNode, label: string }) => (
         <button
             onClick={() => setActiveTab(id)}
             className={`flex flex-col items-center justify-center space-y-1 w-full py-2 text-xs font-medium transition-colors ${activeTab === id ? 'text-brand-red border-b-2 border-brand-red' : 'text-gray-400 hover:text-white'}`}
         >
             {icon}
             <span>{label}</span>
         </button>
    );
    
    const renderContent = () => {
        switch (activeTab) {
            case 'agenda': return <AgendaView appointments={appointments} clients={clients} services={services} onStartService={handleStartService} onFinishService={handleFinishService} onEditAppointment={(app) => {setEditingAppointment(app); setIsAppointmentModalOpen(true); }} onDeleteAppointment={handleAppointmentDelete} />;
            case 'clients': return <ClientsView clients={clients} onAdd={() => {setEditingClient(null); setIsClientModalOpen(true); }} onEdit={(client) => { setEditingClient(client); setIsClientModalOpen(true); }} onDelete={handleClientDelete} monthlyPlans={monthlyPlans} clientPlanUsages={clientPlanUsages} services={services}/>;
            case 'services': return <ServicesView services={services} onAdd={() => { setEditingService(null); setIsServiceModalOpen(true); }} onEdit={(service) => { setEditingService(service); setIsServiceModalOpen(true); }} onDelete={handleServiceDelete} />;
            case 'whatsapp': return <WhatsAppView status={whatsAppStatus} onConnect={handleConnectWhatsApp} services={services} clients={clients} appointments={appointments} onClientAdded={handleAddClientFromWhatsApp} onClientUpdated={handleUpdateClientFromWhatsApp} onAppointmentFinalized={handleFinalizeAppointmentFromWhatsApp} onAppointmentRescheduled={handleRescheduleAppointmentFromWhatsApp} onAppointmentCancelled={handleCancelAppointmentFromWhatsApp} operatingHours={operatingHours} onConversationFinished={handleNewConversation} catalogFiles={catalogFiles} monthlyPlans={monthlyPlans} clientPlanUsages={clientPlanUsages} conversationLogs={conversationLogs} />;
            case 'dashboard': return <DashboardView appointments={appointments} clients={clients} services={services} monthlyPlans={monthlyPlans} />;
            case 'settings': return <SettingsView operatingHours={operatingHours} automatedMessages={automatedMessages} monthlyPlans={monthlyPlans} services={services} credentials={credentials} onSave={handleSaveSettings} onFileUpload={handleFileUpload} catalogFiles={catalogFiles} isProcessingFile={isProcessingFile} onFileDelete={handleFileDelete} />;
            default: return <DashboardView appointments={appointments} clients={clients} services={services} monthlyPlans={monthlyPlans} />;
        }
    };

    if (!isAuthenticated) {
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
                         <div className="relative">
                             <button className="relative">
                                 <BellIcon className="w-6 h-6 text-gray-300 hover:text-white" />
                                 {notifications.filter(n => !n.read).length > 0 && <span className="absolute -top-1 -right-1 flex h-4 w-4"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span><span className="relative inline-flex rounded-full h-4 w-4 bg-red-500 text-white text-xs items-center justify-center">{notifications.filter(n => !n.read).length}</span></span>}
                             </button>
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
                     <TabButton id="dashboard" icon={<ChartPieIcon className="w-6 h-6" />} label="Dashboard" />
                     <TabButton id="agenda" icon={<CalendarDaysIcon className="w-6 h-6" />} label="Agenda" />
                     <TabButton id="clients" icon={<UsersIcon className="w-6 h-6" />} label="Clientes" />
                     <TabButton id="services" icon={<WrenchScrewdriverIcon className="w-6 h-6" />} label="Serviços" />
                     <TabButton id="whatsapp" icon={<ChatBubbleLeftRightIcon className="w-6 h-6" />} label="WhatsApp" />
                     <TabButton id="settings" icon={<Cog6ToothIcon className="w-6 h-6" />} label="Ajustes" />
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
        </div>
    );
};

export default App;