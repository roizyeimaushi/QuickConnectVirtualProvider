"use client";

import { useState, useEffect, useCallback } from "react";

const TOAST_LIMIT = 3;
const TOAST_REMOVE_DELAY = 5000;

let count = 0;
let listeners = [];
let memoryState = { toasts: [] };

function genId() {
    count = (count + 1) % Number.MAX_SAFE_INTEGER;
    return count.toString();
}

function dispatch(action) {
    memoryState = reducer(memoryState, action);
    listeners.forEach((listener) => {
        listener(memoryState);
    });
}

function reducer(state, action) {
    switch (action.type) {
        case "ADD_TOAST":
            return {
                ...state,
                toasts: [action.toast, ...state.toasts].slice(0, TOAST_LIMIT),
            };

        case "UPDATE_TOAST":
            return {
                ...state,
                toasts: state.toasts.map((t) =>
                    t.id === action.toast.id ? { ...t, ...action.toast } : t
                ),
            };

        case "DISMISS_TOAST": {
            const { toastId } = action;

            if (toastId) {
                setTimeout(() => {
                    dispatch({ type: "REMOVE_TOAST", toastId });
                }, TOAST_REMOVE_DELAY);
            } else {
                state.toasts.forEach((toast) => {
                    setTimeout(() => {
                        dispatch({ type: "REMOVE_TOAST", toastId: toast.id });
                    }, TOAST_REMOVE_DELAY);
                });
            }

            return {
                ...state,
                toasts: state.toasts.map((t) =>
                    t.id === toastId || toastId === undefined
                        ? {
                            ...t,
                            open: false,
                        }
                        : t
                ),
            };
        }

        case "REMOVE_TOAST":
            if (action.toastId === undefined) {
                return {
                    ...state,
                    toasts: [],
                };
            }
            return {
                ...state,
                toasts: state.toasts.filter((t) => t.id !== action.toastId),
            };

        default:
            return state;
    }
}

function toast({ ...props }) {
    const id = genId();

    const update = (props) =>
        dispatch({
            type: "UPDATE_TOAST",
            toast: { ...props, id },
        });
    const dismiss = () => dispatch({ type: "DISMISS_TOAST", toastId: id });

    dispatch({
        type: "ADD_TOAST",
        toast: {
            ...props,
            id,
            open: true,
            onOpenChange: (open) => {
                if (!open) dismiss();
            },
        },
    });

    // Auto dismiss after delay
    setTimeout(() => {
        dismiss();
    }, props.duration || TOAST_REMOVE_DELAY);

    return {
        id,
        dismiss,
        update,
    };
}

function useToast() {
    const [state, setState] = useState(memoryState);

    useEffect(() => {
        listeners.push(setState);
        return () => {
            const index = listeners.indexOf(setState);
            if (index > -1) {
                listeners.splice(index, 1);
            }
        };
    }, []);

    return {
        ...state,
        toast,
        dismiss: (toastId) => dispatch({ type: "DISMISS_TOAST", toastId }),
    };
}

export { useToast, toast };
