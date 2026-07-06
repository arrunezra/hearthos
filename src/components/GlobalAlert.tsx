import React from 'react';
import { AlertCircle, CheckCircle2, AlertTriangle, UploadCloud, TrashIcon } from 'lucide-react-native';
import { Icon } from '@/components/ui/icon';
import {
    AlertDialog,
    AlertDialogBackdrop,
    AlertDialogContent,
    AlertDialogBody,
    AlertDialogFooter,
    Box,
    Heading,
    Text,
    Button,
    ButtonText,
    AlertDialogHeader
} from './HOSGluestackUI';

type AlertType = 'success' | 'error' | 'warning' | 'info';

export interface CustomAlertConfig {
    type: AlertType;
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    onConfirm?: () => void;
    onCancel?: () => void;
}

export interface GlobalAlertProps {
    isOpen: boolean;
    onClose: () => void;
    config: CustomAlertConfig;
}

export default function GlobalAlert({
    isOpen,
    onClose,
    config
}: GlobalAlertProps) {

    // 🚀 Gluestack v4 Compliant Configuration: Replaced 'action' with Tailwind styling classes
    const alertConfig: Record<AlertType, {
        icon: React.ComponentType<any>;
        color: string;
        bgColor: string;
        btnClass: string;
        btnTextClass: string;
    }> = {
        success: {
            icon: CheckCircle2,
            color: 'text-emerald-600',
            bgColor: 'bg-emerald-50',
            btnClass: 'bg-emerald-600 active:bg-emerald-700',
            btnTextClass: 'text-white'
        },
        error: {
            icon: TrashIcon,
            color: 'text-red-600',
            bgColor: 'bg-red-50',
            btnClass: 'bg-red-600 active:bg-red-700',
            btnTextClass: 'text-white'
        },
        warning: {
            icon: AlertTriangle,
            color: 'text-amber-600', // 🔧 FIXED: Changed from stroke-success to warning color
            bgColor: 'bg-amber-50',
            btnClass: 'bg-amber-500 active:bg-amber-600',
            btnTextClass: 'text-slate-900'
        },
        info: {
            icon: UploadCloud,
            color: 'text-sky-600',
            bgColor: 'bg-sky-50',
            btnClass: 'bg-sky-600 active:bg-sky-700',
            btnTextClass: 'text-white'
        }
    };

    // Fallback safely to 'info' if type matches incorrectly 
    const current = alertConfig[config.type] || alertConfig.info;

    const handleCancel = () => {
        if (config.onCancel) config.onCancel();
        onClose();
    };

    const handleConfirm = () => {
        if (config.onConfirm) config.onConfirm();
        onClose();
    };

    return (
        <AlertDialog isOpen={isOpen} onClose={handleCancel}>
            <AlertDialogBackdrop />
            <AlertDialogContent className="w-[85%] max-w-[340px] p-6 rounded-3xl gap-4 items-center bg-white shadow-xl">

                {/* 1. Dynamic Icon Container */}
                <Box className={`rounded-full h-[60px] w-[60px] items-center justify-center ${current.bgColor}`}>
                    <Icon
                        as={current.icon}
                        size="xl"
                        className={current.color}
                    />
                </Box>

                {/* 2. Text Content */}
                <AlertDialogHeader className="mb-1">
                    <Heading size="md" className="text-center text-slate-900 font-bold">{config.title}</Heading>
                </AlertDialogHeader>

                <AlertDialogBody>
                    <Text size="sm" className="text-center text-slate-600">
                        {config.message}
                    </Text>
                </AlertDialogBody>

                {/* 3. Footer Buttons Layout */}
                <AlertDialogFooter className="mt-5 w-full flex-row gap-3">
                    {/* Cancel Button - Only displays if explicit actions or custom cancel string is requested */}
                    {(config.onCancel || config.cancelText) && (
                        <Button
                            variant="outline"
                            onPress={handleCancel}
                            className="flex-1 rounded-xl border-slate-300 active:bg-slate-50"
                        >
                            <ButtonText className="text-slate-700 font-medium">
                                {config.cancelText || "Cancel"}
                            </ButtonText>
                        </Button>
                    )}

                    {/* Confirm Button - Uses dynamic colors mapped by theme status */}
                    <Button
                        variant="default"
                        onPress={handleConfirm}
                        className={`flex-1 rounded-xl ${current.btnClass}`}
                    >
                        <ButtonText className={`${current.btnTextClass} font-semibold`}>
                            {config.confirmText || (config.onConfirm ? "Confirm" : "OK")}
                        </ButtonText>
                    </Button>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}