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


type ChatMessageProps = { sender: string; children?: React.ReactNode; isBot?: boolean; operatorName?: string; isTyping?: boolean; };
const ChatMessage: React.FC<ChatMessageProps> = ({ sender, children, isBot, operatorName, isTyping }) => {
    const isClient = sender === 'Cliente';
    const authorLabel = isClient ? sender : (isBot ? 'CAR CLASS (Bot)' : `Você (${operatorName})`);
    
    return (
    <div className={`flex items-end gap-2 ${isClient ? 'justify-start' : 'justify-end'}`}>
        {!isClient && operatorName && <div className="w-8 h-8 bg-blue-600 rounded-full flex-shrink-0 mb-8 flex items-center justify-center font-bold text-white">{operatorName.charAt(0).toUpperCase()}</div>}
        {isBot && <div className="w-8 h-8 bg-brand-red rounded-full flex-shrink-0 mb-8" />}
        
        <div className={`flex flex-col ${isClient ? 'items-start' : 'items-end'}`}>
            <span className="text-xs text-gray-400 mb-1 px-2">{authorLabel}</span>
            <div className={`max-w-xs md:max-w-md p-3 rounded-2xl ${isClient ? 'bg-brand-gray-light text-gray-200 rounded-bl-none' : (isBot ? 'bg-brand-red/80 text-white rounded-br-none' : 'bg-blue-700 text-white rounded-br-none')}`}>
                {isTyping ? <div className="flex items-center gap-1"><div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse"></div><div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse delay-150"></div><div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse delay-300"></div></div> : children}
            </div>
        </div>
    </div>
)};

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
        const url = URL.createObjectURL(file);
        setImageUrl(url);
        return () => {
            URL.revokeObjectURL(url);
        };
    }, [file]);

    if (!imageUrl) {
        return (
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
        connected: { text: 'Conectado', color: 'text-green-400', iconColor: 'text-green-500' },
        disconnected: { text: 'Desconectado', color: 'text-red-400', iconColor: 'text-red-500' },
        loading: { text: 'Aguardando Conexão', color: 'text-yellow-400', iconColor: 'text-yellow-500' }
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

const WhatsAppView = ({ currentUser, services, clients, appointments, onClientAdded, onClientUpdated, onAppointmentFinalized, onAppointmentRescheduled, onAppointmentCancelled, operatingHours, onConversationFinished, catalogFiles, monthlyPlans, clientPlanUsages, conversationLogs, addNotification }: { currentUser: User; services: Service[]; clients: Client[]; appointments: Appointment[]; onClientAdded: (client: Omit<Client, 'id'>) => string; onClientUpdated: (client: Client) => void; onAppointmentFinalized: (data: TempAppointmentData) => void; onAppointmentRescheduled: (id: string, date: string, time: string) => void; onAppointmentCancelled: (id: string) => void; operatingHours: OperatingHours; onConversationFinished: (log: ConversationLog) => void; catalogFiles: { id: string; file: File }[]; monthlyPlans: MonthlyPlan[]; clientPlanUsages: ClientPlanUsage[]; conversationLogs: ConversationLog[]; addNotification: (message: string) => void; }) => {
    const [status, setStatus] = useState<'connected' | 'disconnected' | 'loading'>('disconnected');
    const [qrCode, setQrCode] = useState<string | null>(null);
    const [messages, setMessages] = useState<ChatMessageData[]>([]);
    const [isTyping, setIsTyping] = useState(false);
    const [userInput, setUserInput] = useState('');
    const [conversationState, setConversationState] = useState<ConversationState>('GREETING');
    const [tempData, setTempData] = useState<TempAppointmentData>({ serviceIds: [] });
    const [dateSlotOptions, setDateSlotOptions] = useState<{date: Date, slots: string[]}[]>([]);
    const [isConversationFinished, setIsConversationFinished] = useState(false);
    const [activeConversationId, setActiveConversationId] = useState<'live' | string>('live');
    const [activeChatId, setActiveChatId] = useState<string | null>(null);
    const [isManualMode, setIsManualMode] = useState(false);

    const bottomRef = useRef<HTMLDivElement>(null);
    
    useEffect(() => {
        const checkStatus = async () => {
            try {
                const response = await fetch('/api/whatsapp/status');
                const data = await response.json();
                if (data.isConnected) {
                    setStatus('connected');
                    setQrCode(null);
                } else if (data.qr) {
                    setStatus('loading');
                    setQrCode(data.qr);
                } else {
                    setStatus('loading');
                    setQrCode(null);
                }
            } catch (error) {
                setStatus('disconnected');
                setQrCode(null);
                console.error("Failed to fetch WhatsApp status", error);
            }
        };

        checkStatus();
        const intervalId = setInterval(checkStatus, 3000);
        return () => clearInterval(intervalId);
    }, []);


    const addMessage = (sender: 'Cliente' | 'CAR CLASS', content: React.ReactNode, options?: { isBot?: boolean; operatorName?: string }) => {
        setMessages(prev => [...prev, { sender, content, isBot: options?.isBot ?? (sender === 'CAR CLASS'), operatorName: options?.operatorName }]);
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
                </div>, { isBot: true });
                setConversationState('AWAITING_DATE_AND_TIME_CHOICE');
            } else {
                addMessage('CAR CLASS', <p>Desculpe, não encontramos nenhum horário disponível nos próximos dias. Por favor, entre em contato para agendarmos.</p>, { isBot: true });
                setConversationState('FINISHED');
            }
        } else {
            addMessage('CAR CLASS', <p>Desculpe, não encontramos nenhuma data disponível nos próximos dias. Por favor, entre em contato para agendarmos.</p>, { isBot: true });
            setConversationState('FINISHED');
        }
    };
    
    const finalizeAppointment = useCallback((finalData: TempAppointmentData) => {
        if (finalData.appointmentToChangeId) {
            const appointmentToUpdate = appointments.find(app => app.id === finalData.appointmentToChangeId);
            if (!appointmentToUpdate) {
                addMessage('CAR CLASS', <p>Ocorreu um erro ao encontrar seu agendamento. Por favor, entre em contato conosco.</p>, { isBot: true });
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
            </div>, { isBot: true });
            setConversationState('FINISHED');
            return;
        }

        const client = clients.find(c => c.id === finalData.clientId);
        let car: Car | undefined;
        if (finalData.carId) { car = client?.cars.find(c => c.id === finalData.carId); } 
        else { car = { id: '', model: finalData.carModel!, plate: finalData.carPlate!, protections: finalData.protections! }; }
        
        if (!client || !car) {
             addMessage('CAR CLASS', <p>Ocorreu um erro ao finalizar. Por favor, tente novamente.</p>, { isBot: true });
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
        </div>, { isBot: true });
        
        onAppointmentFinalized(finalData);
        setConversationState('FINISHED');
    }, [clients, services, appointments, onAppointmentFinalized, onAppointmentRescheduled]);
    
    const handleSendManualMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!userInput.trim() || !activeChatId) return;

        const messageContent = userInput;
        setUserInput('');

        addMessage('CAR CLASS', <p>{messageContent}</p>, { isBot: false, operatorName: currentUser.username });

        try {
            const response = await fetch('/api/whatsapp/send-message', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ chatId: activeChatId, message: messageContent }),
            });
            if (!response.ok) {
                throw new Error('Falha ao enviar mensagem');
            }
        } catch (error) {
            console.error("Erro ao enviar mensagem manual:", error);
            addNotification("Erro ao enviar mensagem manual.");
            // Optionally, add the message back to the input
            setUserInput(messageContent);
        }
    };

    const handleSendMessage = (e: React.FormEvent) => {
        e.preventDefault();
        if(isManualMode) {
            handleSendManualMessage(e);
            return;
        }
        if (!userInput.trim()) return;
        addMessage('Cliente', <p>{userInput}</p>, { isBot: false });
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
            addMessage('CAR CLASS', <p>{result.responseText}</p>, { isBot: true });

            if (result.action === 'BOOK_SERVICE' && result.serviceIds && result.serviceIds.length > 0) {
                const validServiceIds = result.serviceIds.filter((id: string) => services.some(s => s.id === id));
                if (validServiceIds.length > 0) {
                    setTempData(prev => ({ ...prev, serviceIds: [...new Set([...(prev.serviceIds || []), ...validServiceIds])] }));
                    thinkAndRespond(startDateTimeSelection, 1500);
                } else {
                     addMessage('CAR CLASS', <p>Peço desculpas, mas não consegui confirmar os serviços que você mencionou em nossa lista. Poderia tentar novamente, por favor?</p>, { isBot: true });
                }
            }
        } catch (error) {
            console.error("Processing error:", error);
            setIsTyping(false);
            addMessage('CAR CLASS', <p>Desculpe, tive um problema para entender sua resposta. Poderia digitar o nome ou código do serviço que deseja?</p>, { isBot: true });
        }
    };

    const processUserInput = (input: string) => {
        const normalizedInput = normalizeText(input);

        // A simple way to get the chatId. In a real app this would be more robust.
        // For now, let's assume any user input in a new convo sets the active chatId.
        if (!activeChatId) {
            // This is a placeholder. The real chatId comes from the server event.
            // This logic needs to be connected to the 'message' event from the server.
            // For now, we disable manual mode if we don't know who to talk to.
            setIsManualMode(false);
        }
        
        switch (conversationState) {
            case 'AWAITING_IS_CLIENT_RESPONSE':
                if (normalizedInput.includes('sim') || normalizedInput.includes('sou') || normalizedInput.includes('ja sou')) {
                    thinkAndRespond(() => {
                        addMessage('CAR CLASS', <p>Que ótimo! Para localizar seu cadastro, por favor, digite seu CPF.</p>, { isBot: true });
                        setConversationState('AWAITING_CPF');
                    });
                } else if (normalizedInput.includes('nao') || normalizedInput.includes('novo') || normalizedInput.includes('cadastrar')) {
                    thinkAndRespond(() => {
                        addMessage('CAR CLASS', <p>Seja bem-vindo(a)! Para começarmos, qual o seu nome completo?</p>, { isBot: true });
                        setConversationState('AWAITING_NEW_CLIENT_NAME');
                    });
                } else {
                    thinkAndRespond(() => {
                        addMessage('CAR CLASS', <p>Desculpe, não entendi. Você já é nosso cliente?</p>, { isBot: true });
                    });
                }
                break;

            case 'AWAITING_CPF':
                const foundClient = clients.find(c => c.cpf.replace(/\D/g, '') === input.replace(/\D/g, ''));
                if (foundClient) {
                    setTempData(prev => ({ ...prev, clientId: foundClient.id }));
                    const upcomingAppointments = appointments.filter(app => app.clientId === foundClient.id && app.status !== AppointmentStatus.Finished);
                    thinkAndRespond(() => {
                        if (upcomingAppointments.length > 0) {
                             const appDetails = upcomingAppointments.map((app, index) => {
                                const serviceNames = app.serviceIds.map(id => services.find(s => s.id === id)?.name).filter(Boolean).join(', ');
                                const dateObj = new Date(app.date + 'T00:00:00');
                                const formattedDate = dateObj.toLocaleDateString('pt-BR', {day: '2-digit', month: 'long'});
                                return <li key={app.id}><strong>{index + 1}:</strong> {serviceNames} em {formattedDate} às {app.time}</li>
                            });
                            addMessage('CAR CLASS', <div>
                                <p>Olá, {foundClient.name}! Encontrei o(s) seguinte(s) agendamento(s) em seu nome:</p>
                                <ul className="list-none mt-2 space-y-1">{appDetails}</ul>
                                <p className="mt-2">Você deseja <strong>alterar</strong>, <strong>cancelar</strong> um deles ou fazer um <strong>novo</strong> agendamento?</p>
                            </div>, { isBot: true });
                            setConversationState('AWAITING_EXISTING_APPOINTMENT_ACTION');
                        } else {
                            addMessage('CAR CLASS', <div><p>Olá, {foundClient.name}! Como posso ajudar hoje? Deseja fazer um novo agendamento?</p><p className="text-sm mt-1">Você pode me dizer o que precisa (ex: "quero uma vitrificação") ou pedir o catálogo de serviços.</p></div>, { isBot: true });
                            setConversationState('AWAITING_SERVICE_SELECTION');
                        }
                    });
                } else {
                    thinkAndRespond(() => {
                        addMessage('CAR CLASS', <p>Não encontrei um cadastro com este CPF. Gostaria de se cadastrar?</p>, { isBot: true });
                         setConversationState('AWAITING_IS_CLIENT_RESPONSE'); // Go back
                    });
                }
                break;
            
            case 'AWAITING_SERVICE_SELECTION':
                 if (normalizedInput.includes('catalogo')) {
                    thinkAndRespond(() => {
                        if (catalogFiles.length > 0) {
                            addMessage('CAR CLASS', <p>Claro! Aqui está nosso catálogo de serviços:</p>, { isBot: true });
                            catalogFiles.forEach(cf => {
                                const isPdf = cf.file.type === 'application/pdf';
                                addMessage('CAR CLASS', <FileAttachment fileName={cf.file.name} fileType={isPdf ? 'pdf' : 'jpg'} />, { isBot: true });
                            });
                            addMessage('CAR CLASS', <p>Por favor, me diga o nome ou código do serviço que você deseja.</p>, { isBot: true });
                        } else {
                             addMessage('CAR CLASS', <p>Peço desculpas, mas não tenho um catálogo para enviar no momento. Mas você pode me dizer o que precisa e eu te ajudo! (ex: "preciso de uma limpeza interna completa").</p>, { isBot: true });
                        }
                    });
                } else {
                    handleServiceSelectionLogic(input);
                }
                break;
            
            case 'AWAITING_DATE_AND_TIME_CHOICE':
                const lowerInput = input.toLowerCase();
                let chosenDate: Date | undefined;
                let chosenTime: string | undefined;

                // Match "1 09:00" or "1 9:00"
                const numberMatch = lowerInput.match(/^(\d+)\s+(\d{1,2}:\d{2})$/);
                if (numberMatch && dateSlotOptions[parseInt(numberMatch[1]) - 1]) {
                    chosenDate = dateSlotOptions[parseInt(numberMatch[1]) - 1].date;
                    chosenTime = numberMatch[2].padStart(5, '0'); // Normalize 9:00 to 09:00
                } else {
                    // Match "terca 09:00" or "terça 09:00"
                    const nameMatch = lowerInput.match(/^(\w+)\s+(\d{1,2}:\d{2})$/);
                    if (nameMatch) {
                        const dayName = normalizeText(nameMatch[1]);
                        const matchedPair = dateSlotOptions.find(pair => {
                            const pairDayName = normalizeText(pair.date.toLocaleDateString('pt-BR', { weekday: 'long' }));
                            return pairDayName.startsWith(dayName);
                        });
                        if (matchedPair) {
                            chosenDate = matchedPair.date;
                            chosenTime = nameMatch[2].padStart(5, '0');
                        }
                    }
                }
                
                if (chosenDate && chosenTime) {
                    const chosenPair = dateSlotOptions.find(p => p.date.toISOString().split('T')[0] === chosenDate?.toISOString().split('T')[0]);
                    if (chosenPair && chosenPair.slots.includes(chosenTime)) {
                        setTempData(prev => ({ ...prev, date: chosenDate?.toISOString().split('T')[0], time: chosenTime }));
                        thinkAndRespond(() => {
                            const client = clients.find(c => c.id === tempData.clientId);
                            if (client && client.cars.length > 0) {
                                const carOptions = client.cars.map((car, index) => (
                                    <li key={car.id}><strong>{index + 1}:</strong> {car.model} ({car.plate})</li>
                                ));
                                addMessage('CAR CLASS', <div>
                                    <p>Ótima escolha! Para qual dos seus veículos é o serviço?</p>
                                    <ul className="list-none mt-2 space-y-1">{carOptions}</ul>
                                    <p className="mt-2">Se for um veículo novo, basta digitar "novo".</p>
                                </div>, { isBot: true });
                                setConversationState('AWAITING_VEHICLE_CONFIRMATION');
                            } else {
                                addMessage('CAR CLASS', <p>Ótima escolha! Agora, por favor, me diga o modelo do seu veículo (ex: Honda Civic).</p>, { isBot: true });
                                setConversationState('AWAITING_NEW_VEHICLE_MODEL');
                            }
                        });
                    } else {
                        thinkAndRespond(() => addMessage('CAR CLASS', <p>Desculpe, o horário "{chosenTime}" não está disponível para esta data. Por favor, escolha um dos horários listados.</p>, { isBot: true }));
                    }
                } else {
                    thinkAndRespond(() => addMessage('CAR CLASS', <p>Não consegui entender sua escolha. Por favor, digite no formato "dia hora" ou "número hora", como nos exemplos.</p>, { isBot: true }));
                }
                break;
            
            case 'AWAITING_VEHICLE_CONFIRMATION':
                const client = clients.find(c => c.id === tempData.clientId);
                if (!client) break; 
                
                if (normalizedInput.includes('novo')) {
                    thinkAndRespond(() => {
                        addMessage('CAR CLASS', <p>Ok! Qual o modelo do novo veículo?</p>, { isBot: true });
                        setConversationState('AWAITING_NEW_VEHICLE_MODEL');
                    });
                } else {
                    const index = parseInt(input, 10) - 1;
                    if (!isNaN(index) && client.cars[index]) {
                        const car = client.cars[index];
                        setTempData(prev => ({...prev, carId: car.id}));
                        thinkAndRespond(() => finalizeAppointment({...tempData, carId: car.id}));
                    } else {
                         thinkAndRespond(() => addMessage('CAR CLASS', <p>Opção inválida. Por favor, digite o número correspondente ao seu veículo.</p>, { isBot: true }));
                    }
                }
                break;

             // --- Add other conversation states here ---

            case 'FINISHED':
            default:
                thinkAndRespond(() => {
                    addMessage('CAR CLASS', <p>Se precisar de mais alguma coisa, é só chamar! Para iniciar uma nova conversa, digite "oi".</p>, { isBot: true });
                    setIsConversationFinished(true); // Locks the input until reset
                });
                break;
        }
    };

    const resetConversation = () => {
        addMessage('CAR CLASS', <p>Olá! Bem-vindo(a) ao atendimento automatizado da CAR CLASS. Já é nosso cliente?</p>, { isBot: true });
        setConversationState('AWAITING_IS_CLIENT_RESPONSE');
        setMessages([]);
        setTempData({ serviceIds: [] });
        setIsConversationFinished(false);
        setActiveConversationId('live');
        setActiveChatId(null);
        setIsManualMode(false);
    };

    useEffect(() => {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, isTyping]);
    
     useEffect(() => {
        if (conversationState === 'GREETING') {
            resetConversation();
        }
    }, [conversationState]);
    
    const displayedMessages = activeConversationId === 'live'
    ? messages
    : conversationLogs.find(log => log.id === activeConversationId)?.messages || [];


    return (
        <div className="flex flex-col h-full">
            <div className="flex-shrink-0 p-4">
                 <WhatsAppConnectionStatus status={status} />
                 {status === 'loading' && qrCode && (
                    <div className="bg-white p-4 rounded-lg flex flex-col items-center">
                        <p className="text-black font-semibold mb-2">Escaneie para conectar</p>
                        <img src={qrCode} alt="QR Code do WhatsApp" className="rounded-lg" />
                    </div>
                )}
                 {status === 'disconnected' && (
                     <div className="bg-red-900/50 border border-red-500 p-3 rounded-lg text-center">
                        <p className="text-red-300 font-semibold">Conexão perdida</p>
                        <p className="text-red-400 text-sm mt-1">Ocorreu um erro. O sistema tentará reconectar automaticamente.</p>
                     </div>
                 )}
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {displayedMessages.map((msg, index) => (
                    <ChatMessage key={index} sender={msg.sender} isBot={msg.isBot} operatorName={msg.operatorName}>{msg.content}</ChatMessage>
                ))}
                {isTyping && <ChatMessage sender="CAR CLASS" isBot isTyping />}
                 <div ref={bottomRef} />
            </div>

             {isConversationFinished && activeConversationId === 'live' &&(
                <div className="p-4 flex-shrink-0">
                    <button
                        onClick={resetConversation}
                        className="w-full flex items-center justify-center gap-2 bg-brand-red hover:bg-red-700 text-white font-bold py-3 px-4 rounded-md transition-colors"
                    >
                        <ArrowPathIcon className="w-5 h-5"/>
                        Iniciar Nova Conversa
                    </button>
                </div>
            )}

            {activeConversationId === 'live' && !isConversationFinished && (
                <div className="flex-shrink-0 p-4 bg-brand-gray-dark border-t border-white/10">
                    <form onSubmit={handleSendMessage} className="flex items-center gap-2">
                        <input
                            type="text"
                            value={userInput}
                            onChange={(e) => setUserInput(e.target.value)}
                            placeholder={isManualMode ? "Digite sua mensagem manual..." : "Digite sua resposta..."}
                            className="flex-1 bg-brand-gray-light border border-brand-gray-light rounded-full py-2 px-4 text-white focus:outline-none focus:ring-2 focus:ring-brand-red"
                            disabled={isTyping || status !== 'connected'}
                        />
                        <button
                            type="submit"
                            className="bg-brand-red text-white rounded-full p-3 hover:bg-red-700 transition-colors disabled:bg-gray-500"
                            disabled={isTyping || status !== 'connected'}
                        >
                            <PaperAirplaneIcon className="w-5 h-5" />
                        </button>
                    </form>
                </div>
            )}
        </div>
    );
};

const SettingsView = () => {
    return <div className="p-4 text-white">Configurações em breve...</div>;
};

const App: React.FC = () => {
    const [activeTab, setActiveTab] = useState('dashboard');
    const [clients, setClients] = useState<Client[]>(MOCK_CLIENTS);
    const [services, setServices] = useState<Service[]>(MOCK_SERVICES);
    const [appointments, setAppointments] = useState<Appointment[]>(MOCK_APPOINTMENTS);
    const [monthlyPlans, setMonthlyPlans] = useState<MonthlyPlan[]>(MOCK_PLANS);
    const [clientPlanUsages, setClientPlanUsages] = useState<ClientPlanUsage[]>(MOCK_CLIENT_PLAN_USAGE);

    const [editingClient, setEditingClient] = useState<Client | null>(null);
    const [editingService, setEditingService] = useState<Service | null>(null);
    const [editingAppointment, setEditingAppointment] = useState<Appointment | null>(null);
    const [isClientModalOpen, setIsClientModalOpen] = useState(false);
    const [isServiceModalOpen, setIsServiceModalOpen] = useState(false);
    const [isAppointmentModalOpen, setIsAppointmentModalOpen] = useState(false);
    
    const [notifications, setNotifications] = useState<NotificationItem[]>([]);
    
    // --- Mock Logged-in User ---
    const [currentUser] = useState<User>({
        id: 'user-001',
        username: 'Admin',
        password: 'hashed_password',
        role: 'owner',
        permissions: ALL_TABS.reduce((acc, tab) => ({ ...acc, [tab.id]: true }), {})
    });

     // --- Mock Operating Hours ---
     const [operatingHours] = useState<OperatingHours>({
        daysOpen: [1, 2, 3, 4, 5, 6], // Seg a Sáb (0=Dom, 1=Seg...)
        availableTimes: ['08:00', '09:00', '10:00', '11:00', '13:00', '14:00', '15:00', '16:00', '17:00'],
    });

    const [catalogFiles, setCatalogFiles] = useState<{ id: string, file: File }[]>([]);
    const [conversationLogs, setConversationLogs] = useState<ConversationLog[]>([]);

    const addNotification = useCallback((message: string) => {
        const newNotification: NotificationItem = {
            id: `notif-${Date.now()}`,
            message,
            timestamp: new Date(),
            read: false,
        };
        setNotifications(prev => [newNotification, ...prev]);
    }, []);

    const handleStartService = (id: string) => {
        setAppointments(apps => apps.map(app => app.id === id ? { ...app, status: AppointmentStatus.InProgress } : app));
        const app = appointments.find(a => a.id === id);
        const client = clients.find(c => c.id === app?.clientId);
        if(client) addNotification(`Serviço para ${client.name} iniciado.`);
    };

    const handleFinishService = (id: string) => {
        setAppointments(apps => apps.map(app => app.id === id ? { ...app, status: AppointmentStatus.Finished } : app));
        const app = appointments.find(a => a.id === id);
        const client = clients.find(c => c.id === app?.clientId);
        if(client) addNotification(`Serviço para ${client.name} finalizado. Cliente notificado.`);
    };

    const handleAddClient = () => {
        setEditingClient(null);
        setIsClientModalOpen(true);
    };
    const handleEditClient = (client: Client) => {
        setEditingClient(client);
        setIsClientModalOpen(true);
    };
    const handleDeleteClient = (id: string) => {
        if (window.confirm('Tem certeza que deseja excluir este cliente?')) {
            setClients(c => c.filter(client => client.id !== id));
            addNotification("Cliente excluído com sucesso.");
        }
    };
    const handleSaveClient = (clientData: Omit<Client, 'id'> | Client) => {
        if ('id' in clientData) {
            setClients(c => c.map(client => client.id === clientData.id ? clientData : client));
            addNotification("Cliente atualizado com sucesso.");
        } else {
            const newClient = { ...clientData, id: `client-${Date.now()}` };
            setClients(c => [...c, newClient]);
            addNotification("Cliente adicionado com sucesso.");
        }
        setIsClientModalOpen(false);
    };

    const handleAddService = () => {
        setEditingService(null);
        setIsServiceModalOpen(true);
    };
    const handleEditService = (service: Service) => {
        setEditingService(service);
        setIsServiceModalOpen(true);
    };
    const handleDeleteService = (id: string) => {
         if (window.confirm('Tem certeza que deseja excluir este serviço?')) {
            setServices(s => s.filter(service => service.id !== id));
            addNotification("Serviço excluído com sucesso.");
        }
    };
    const handleSaveService = (serviceData: Omit<Service, 'id'> | Service) => {
        if ('id' in serviceData) {
            setServices(s => s.map(service => service.id === serviceData.id ? serviceData : service));
             addNotification("Serviço atualizado com sucesso.");
        } else {
            const newService = { ...serviceData, id: `service-${Date.now()}` };
            setServices(s => [...s, newService]);
            addNotification("Serviço adicionado com sucesso.");
        }
        setIsServiceModalOpen(false);
    };
    
    const handleAddAppointment = () => {
        setEditingAppointment(null);
        setIsAppointmentModalOpen(true);
    };
    const handleEditAppointment = (appointment: Appointment) => {
        setEditingAppointment(appointment);
        setIsAppointmentModalOpen(true);
    };
    const handleDeleteAppointment = (id: string) => {
        if (window.confirm('Tem certeza que deseja excluir este agendamento?')) {
            setAppointments(a => a.filter(app => app.id !== id));
            addNotification("Agendamento excluído com sucesso.");
        }
    };
     const handleSaveAppointment = (appointmentData: Omit<Appointment, 'id' | 'status'> | (Appointment & { status: AppointmentStatus })) => {
        if ('id' in appointmentData) {
            setAppointments(a => a.map(app => app.id === appointmentData.id ? appointmentData : app));
            addNotification("Agendamento atualizado com sucesso.");
        } else {
            const newAppointment: Appointment = {
                ...appointmentData,
                id: `app-${Date.now()}`,
                status: AppointmentStatus.Scheduled,
            };
            setAppointments(a => [...a, newAppointment]);
            addNotification("Agendamento criado com sucesso.");
        }
        setIsAppointmentModalOpen(false);
    };
    
    const handleBotClientAdded = (clientData: Omit<Client, 'id'>): string => {
        const newClient = { ...clientData, id: `client-${Date.now()}` };
        setClients(c => [...c, newClient]);
        addNotification(`Novo cliente cadastrado via WhatsApp: ${newClient.name}`);
        return newClient.id;
    };

    const handleBotClientUpdated = (client: Client) => {
         setClients(c => c.map(c_ => c_.id === client.id ? client : c_));
         addNotification(`Dados de ${client.name} atualizados via WhatsApp.`);
    };

    const handleBotAppointmentFinalized = (data: TempAppointmentData) => {
        let finalClientId = data.clientId;
        // Create new client if needed
        if (!finalClientId) {
             const newClientId = handleBotClientAdded({
                name: data.clientName!,
                cpf: data.clientCpf!,
                whatsapp: 'WHATSAPP_NUMBER', // This should come from the message context
                cars: [],
             });
             finalClientId = newClientId;
        }

        let client = clients.find(c => c.id === finalClientId);
        if (!client) {
            // This case should be rare after the creation logic above
            console.error("Client not found after creation/lookup");
            return;
        }

        // Add new car to client if needed
        if (!data.carId) {
            const newCar: Car = {
                id: `car-${Date.now()}`,
                model: data.carModel!,
                plate: data.carPlate!,
                protections: data.protections || [],
            };
            const updatedClient = { ...client, cars: [...client.cars, newCar] };
            handleBotClientUpdated(updatedClient);
            data.carId = newCar.id;
        }

        const newAppointment: Appointment = {
            id: `app-${Date.now()}`,
            clientId: finalClientId!,
            carId: data.carId!,
            serviceIds: data.serviceIds!,
            date: data.date!,
            time: data.time!,
            status: AppointmentStatus.Scheduled,
            paymentMethod: data.paymentMethod,
        };
        setAppointments(a => [...a, newAppointment]);
        addNotification(`Novo agendamento via WhatsApp para ${client.name}.`);
    };

    const handleBotAppointmentRescheduled = (id: string, newDate: string, newTime: string) => {
        setAppointments(apps => apps.map(app => app.id === id ? { ...app, date: newDate, time: newTime } : app));
        const app = appointments.find(a => a.id === id);
        const client = clients.find(c => c.id === app?.clientId);
        if(client) addNotification(`Agendamento para ${client.name} remarcado.`);
    };

    const handleBotAppointmentCancelled = (id: string) => {
         setAppointments(a => a.filter(app => app.id !== id));
         const app = appointments.find(a => a.id === id);
         const client = clients.find(c => c.id === app?.clientId);
         if(client) addNotification(`Agendamento para ${client.name} cancelado.`);
    };

    const handleConversationFinished = (log: ConversationLog) => {
        setConversationLogs(prev => [log, ...prev]);
    };

    const tabs = [
        { id: 'dashboard', label: 'Dashboard', icon: ChartPieIcon },
        { id: 'agenda', label: 'Agenda', icon: CalendarDaysIcon },
        { id: 'clients', label: 'Clientes', icon: UsersIcon },
        { id: 'services', label: 'Serviços', icon: WrenchScrewdriverIcon },
        { id: 'whatsapp', label: 'WhatsApp', icon: ChatBubbleLeftRightIcon },
        { id: 'settings', label: 'Ajustes', icon: Cog6ToothIcon },
    ];
    
    const visibleTabs = tabs.filter(tab => currentUser.permissions[tab.id]);

    const renderView = () => {
        switch (activeTab) {
            case 'agenda':
                return <AgendaView appointments={appointments} clients={clients} services={services} onStartService={handleStartService} onFinishService={handleFinishService} onEditAppointment={handleEditAppointment} onDeleteAppointment={handleDeleteAppointment} />;
            case 'clients':
                return <ClientsView clients={clients} onAdd={handleAddClient} onEdit={handleEditClient} onDelete={handleDeleteClient} monthlyPlans={monthlyPlans} clientPlanUsages={clientPlanUsages} services={services} />;
            case 'services':
                return <ServicesView services={services} onAdd={handleAddService} onEdit={handleEditService} onDelete={handleDeleteService}/>;
            case 'whatsapp':
                return <WhatsAppView currentUser={currentUser} services={services} clients={clients} appointments={appointments} onClientAdded={handleBotClientAdded} onClientUpdated={handleBotClientUpdated} onAppointmentFinalized={handleBotAppointmentFinalized} onAppointmentRescheduled={handleBotAppointmentRescheduled} onAppointmentCancelled={handleBotAppointmentCancelled} operatingHours={operatingHours} onConversationFinished={handleConversationFinished} catalogFiles={catalogFiles} monthlyPlans={monthlyPlans} clientPlanUsages={clientPlanUsages} conversationLogs={conversationLogs} addNotification={addNotification} />;
            case 'settings':
                return <SettingsView />;
            case 'dashboard':
            default:
                return <DashboardView appointments={appointments} clients={clients} services={services} onAddAppointment={handleAddAppointment} />;
        }
    };
    
    return (
        <div className="bg-brand-gray-dark text-white font-sans min-h-screen flex flex-col md:flex-row">
            {/* Sidebar for Desktop */}
            <nav className="hidden md:flex flex-col w-64 bg-brand-gray-dark border-r border-white/10 p-4 space-y-2">
                <div className="text-center mb-4">
                    <img src="https://i.ibb.co/RFS2dzp/367528167-710099640950435-2122611024923455495-n.jpg" alt="CAR CLASS Logo" className="w-24 h-24 mx-auto rounded-full border-2 border-brand-red-dark" />
                    <h1 className="text-2xl font-bold mt-2 text-brand-red">CAR CLASS</h1>
                </div>
                {visibleTabs.map(tab => (
                    <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`flex items-center gap-3 px-4 py-2 rounded-lg transition-colors text-left ${activeTab === tab.id ? 'bg-brand-red text-white' : 'text-gray-300 hover:bg-brand-gray-medium hover:text-white'}`}>
                        <tab.icon className="w-6 h-6"/>
                        <span className="font-semibold">{tab.label}</span>
                    </button>
                ))}
                <div className="flex-grow"></div>
                <div className="border-t border-white/10 pt-4 flex items-center gap-3">
                    <UserCircleIcon className="w-10 h-10 text-gray-400"/>
                    <div>
                        <p className="font-semibold">{currentUser.username}</p>
                        <p className="text-sm text-gray-500 capitalize">{currentUser.role}</p>
                    </div>
                </div>
            </nav>

            {/* Main Content */}
            <main className="flex-1 flex flex-col h-screen">
                 <header className="flex-shrink-0 bg-brand-gray-dark border-b border-white/10 flex md:hidden items-center justify-between p-2">
                    <div className="flex items-center gap-2">
                        <img src="https://i.ibb.co/RFS2dzp/367528167-710099640950435-2122611024923455495-n.jpg" alt="CAR CLASS Logo" className="w-10 h-10 rounded-full border border-brand-red-dark" />
                        <h1 className="text-lg font-bold text-brand-red">CAR CLASS</h1>
                    </div>
                    {/* Add notification bell and profile icon for mobile header */}
                </header>
                <div className="flex-1 overflow-y-auto">
                   {renderView()}
                </div>
                {/* Bottom Nav for Mobile */}
                 <nav className="flex md:hidden justify-around bg-brand-gray-medium border-t border-white/10 p-2">
                    {visibleTabs.map(tab => (
                        <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`flex flex-col items-center p-1 rounded-md transition-colors text-center ${activeTab === tab.id ? 'text-brand-red' : 'text-gray-400'}`}>
                            <tab.icon className="w-6 h-6"/>
                            <span className="text-xs mt-1">{tab.label}</span>
                        </button>
                    ))}
                </nav>
            </main>
            
            {/* Modals */}
             {isAppointmentModalOpen && (
                <AppointmentModal
                    isOpen={isAppointmentModalOpen}
                    onClose={() => setIsAppointmentModalOpen(false)}
                    onSave={handleSaveAppointment}
                    appointment={editingAppointment}
                    clients={clients}
                    services={services}
                />
            )}
        </div>
    );
};


// --- MODAL & FORM COMPONENTS ---

type ModalProps = { isOpen: boolean; onClose: () => void; title: string; children: React.ReactNode; };
const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children }) => {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50 animate-fade-in">
            <div className="bg-brand-gray-medium rounded-lg shadow-xl w-full max-w-lg max-h-[90vh] flex flex-col border border-brand-red-dark">
                <div className="flex justify-between items-center p-4 border-b border-white/10">
                    <h2 className="text-xl font-bold text-white">{title}</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-white"><XMarkIcon className="w-6 h-6"/></button>
                </div>
                <div className="p-6 overflow-y-auto">{children}</div>
            </div>
        </div>
    );
};

type FormInputProps = React.InputHTMLAttributes<HTMLInputElement> & { label: string; };
const FormInput: React.FC<FormInputProps> = ({ label, ...props }) => (
    <div>
        <label className="block text-sm font-medium text-gray-300 mb-1">{label}</label>
        <input {...props} className="w-full bg-brand-gray-dark border border-brand-gray-light text-white rounded-md p-2 focus:ring-brand-red focus:border-brand-red" />
    </div>
);
type FormTextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement> & { label: string; };
const FormTextarea: React.FC<FormTextareaProps> = ({ label, ...props }) => (
    <div>
        <label className="block text-sm font-medium text-gray-300 mb-1">{label}</label>
        <textarea {...props} rows={3} className="w-full bg-brand-gray-dark border border-brand-gray-light text-white rounded-md p-2 focus:ring-brand-red focus:border-brand-red" />
    </div>
);
type FormSelectProps = React.SelectHTMLAttributes<HTMLSelectElement> & { label: string; children: React.ReactNode; };
const FormSelect: React.FC<FormSelectProps> = ({ label, children, ...props }) => (
    <div>
        <label className="block text-sm font-medium text-gray-300 mb-1">{label}</label>
        <select {...props} className="w-full bg-brand-gray-dark border border-brand-gray-light text-white rounded-md p-2 focus:ring-brand-red focus:border-brand-red">
            {children}
        </select>
    </div>
);

type AppointmentModalProps = { isOpen: boolean; onClose: () => void; onSave: (data: Omit<Appointment, 'id' | 'status'> | (Appointment & { status: AppointmentStatus })) => void; appointment: Appointment | null; clients: Client[]; services: Service[]; };
const AppointmentModal: React.FC<AppointmentModalProps> = ({ isOpen, onClose, onSave, appointment, clients, services }) => {
    const [formData, setFormData] = useState({
        clientId: appointment?.clientId || '',
        carId: appointment?.carId || '',
        serviceIds: appointment?.serviceIds || [],
        date: appointment?.date || new Date().toISOString().split('T')[0],
        time: appointment?.time || '',
        paymentMethod: appointment?.paymentMethod || 'PIX'
    });
    const [selectedClient, setSelectedClient] = useState<Client | null>(clients.find(c => c.id === formData.clientId) || null);

    useEffect(() => {
        if (appointment) {
            setFormData({
                clientId: appointment.clientId,
                carId: appointment.carId,
                serviceIds: appointment.serviceIds,
                date: appointment.date,
                time: appointment.time,
                paymentMethod: appointment.paymentMethod || 'PIX'
            });
            setSelectedClient(clients.find(c => c.id === appointment.clientId) || null);
        }
    }, [appointment, clients]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        if (name === 'clientId') {
            const client = clients.find(c => c.id === value);
            setSelectedClient(client || null);
            // Reset carId if client changes
            setFormData(prev => ({ ...prev, clientId: value, carId: '' }));
        } else {
            setFormData(prev => ({ ...prev, [name]: value }));
        }
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
        const dataToSave = appointment ? { ...appointment, ...formData } : formData;
        onSave(dataToSave as any);
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={appointment ? 'Editar Agendamento' : 'Novo Agendamento'}>
            <form onSubmit={handleSubmit} className="space-y-4">
                <FormSelect label="Cliente" name="clientId" value={formData.clientId} onChange={handleChange} required>
                    <option value="">Selecione um cliente</option>
                    {clients.map(client => <option key={client.id} value={client.id}>{client.name}</option>)}
                </FormSelect>
                {selectedClient && (
                     <FormSelect label="Veículo" name="carId" value={formData.carId} onChange={handleChange} required>
                        <option value="">Selecione um veículo</option>
                        {selectedClient.cars.map(car => <option key={car.id} value={car.id}>{car.model} ({car.plate})</option>)}
                    </FormSelect>
                )}
                <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">Serviços</label>
                    <div className="grid grid-cols-2 gap-2 p-2 bg-brand-gray-dark rounded-md max-h-40 overflow-y-auto">
                        {services.map(service => (
                             <label key={service.id} className="flex items-center gap-2 p-2 rounded-md hover:bg-brand-gray-light transition-colors cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={formData.serviceIds.includes(service.id)}
                                    onChange={() => handleServiceChange(service.id)}
                                    className="h-4 w-4 rounded bg-brand-gray-light border-gray-600 text-brand-red focus:ring-brand-red"
                                />
                                <span className="text-sm">{service.name}</span>
                            </label>
                        ))}
                    </div>
                </div>
                 <div className="grid grid-cols-2 gap-4">
                    <FormInput label="Data" name="date" type="date" value={formData.date} onChange={handleChange} required />
                    <FormInput label="Hora" name="time" type="time" value={formData.time} onChange={handleChange} required />
                </div>
                <FormSelect label="Método de Pagamento" name="paymentMethod" value={formData.paymentMethod} onChange={handleChange}>
                    <option>PIX</option>
                    <option>Cartão de Crédito</option>
                    <option>Cartão de Débito</option>
                    <option>Dinheiro</option>
                </FormSelect>
                 <div className="flex justify-end gap-2 pt-4 border-t border-white/10">
                    <button type="button" onClick={onClose} className="bg-brand-gray-light text-white px-4 py-2 rounded-md hover:bg-opacity-80">Cancelar</button>
                    <button type="submit" className="bg-brand-red text-white px-4 py-2 rounded-md hover:bg-opacity-80">Salvar</button>
                </div>
            </form>
        </Modal>
    );
};

// --- DASHBOARD COMPONENTS ---
const StatCard = ({ icon: Icon, title, value, change, changeType }: { icon: React.FC<{className?: string}>; title: string; value: string; change?: string; changeType?: 'increase' | 'decrease' }) => (
    <div className="bg-brand-gray-medium p-4 rounded-lg flex items-center gap-4 border border-white/10">
        <div className="bg-brand-red/20 p-3 rounded-full">
            <Icon className="w-6 h-6 text-brand-red"/>
        </div>
        <div>
            <p className="text-gray-400 text-sm">{title}</p>
            <p className="text-2xl font-bold text-white">{value}</p>
        </div>
    </div>
);

const DashboardView = ({ appointments, clients, services, onAddAppointment }: { appointments: Appointment[]; clients: Client[]; services: Service[]; onAddAppointment: () => void; }) => {
    const totalRevenue = appointments
        .filter(app => app.status === AppointmentStatus.Finished)
        .reduce((sum, app) => sum + app.serviceIds.reduce((s, id) => s + (services.find(ser => ser.id === id)?.price || 0), 0), 0)
        .toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
        
    const serviceCount = useMemo(() => {
        const counts: Record<string, number> = {};
        appointments.forEach(app => {
            app.serviceIds.forEach(id => {
                counts[id] = (counts[id] || 0) + 1;
            });
        });
        return Object.entries(counts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 3)
            .map(([id, count]) => ({ service: services.find(s => s.id === id), count }));
    }, [appointments, services]);

     const topClients = useMemo(() => {
        const counts: Record<string, number> = {};
        appointments.filter(app => app.status === AppointmentStatus.Finished).forEach(app => {
             counts[app.clientId] = (counts[app.clientId] || 0) + 1;
        });
        return Object.entries(counts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 3)
            .map(([id, count]) => ({ client: clients.find(c => c.id === id), count }));
    }, [appointments, clients]);

    const upcomingAppointments = appointments
        .filter(app => new Date(app.date) >= new Date(new Date().toDateString()) && app.status === AppointmentStatus.Scheduled)
        .sort((a, b) => `${a.date}T${a.time}`.localeCompare(`${b.date}T${b.time}`))
        .slice(0, 3);
        
    return (
        <div className="p-4 space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold text-white">Dashboard</h1>
                <button onClick={onAddAppointment} className="flex items-center gap-2 bg-brand-red hover:bg-red-700 text-white font-bold py-2 px-4 rounded-md transition-colors"><PlusIcon className="w-5 h-5" />Agendamento Rápido</button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <StatCard icon={CurrencyDollarIcon} title="Faturamento Total" value={totalRevenue} />
                <StatCard icon={WrenchScrewdriverIcon} title="Serviços Realizados" value={appointments.filter(a => a.status === AppointmentStatus.Finished).length.toString()} />
                <StatCard icon={UsersIcon} title="Clientes Ativos" value={clients.length.toString()} />
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 bg-brand-gray-medium p-4 rounded-lg border border-white/10">
                    <h2 className="text-lg font-semibold text-white mb-3">Próximos Agendamentos</h2>
                    <div className="space-y-3">
                        {upcomingAppointments.length > 0 ? (
                            upcomingAppointments.map(app => {
                                const client = clients.find(c => c.id === app.clientId);
                                const serviceNames = app.serviceIds.map(id => services.find(s => s.id === id)?.name).filter(Boolean).join(', ');
                                const date = new Date(app.date + 'T00:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'long' });
                                return (
                                <div key={app.id} className="flex items-center justify-between p-3 bg-brand-gray-light rounded-md">
                                    <div>
                                        <p className="font-bold text-white">{client?.name}</p>
                                        <p className="text-sm text-gray-300">{serviceNames}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="font-semibold text-brand-red">{date}</p>
                                        <p className="text-sm text-gray-400">{app.time}</p>
                                    </div>
                                </div>
                                )
                            })
                        ) : (
                            <p className="text-gray-400 text-center py-4">Nenhum agendamento futuro.</p>
                        )}
                    </div>
                </div>
                 <div className="bg-brand-gray-medium p-4 rounded-lg border border-white/10">
                     <h2 className="text-lg font-semibold text-white mb-3">Serviços Populares</h2>
                     <ul className="space-y-3">
                        {serviceCount.map(({service, count}) => service && (
                            <li key={service.id} className="flex justify-between items-center text-sm">
                                <span className="text-gray-300">{service.name}</span>
                                <span className="font-bold text-white bg-brand-red/30 px-2 py-0.5 rounded">{count}x</span>
                            </li>
                        ))}
                     </ul>
                 </div>
            </div>
        </div>
    );
};

export default App;
