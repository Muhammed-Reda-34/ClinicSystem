import {
  useQueryClient,
} from "@tanstack/react-query";
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  getSelectedDoctorId,
  setSelectedDoctorId,
} from "../../lib/doctorScopeStore";
import type {
  AccessibleDoctor,
} from "../../types/context";
import { useAuth } from "../auth/AuthContext";
import {
  getAccessibleDoctors,
} from "./api/contextApi";

type DoctorContextValue = {
  doctors: AccessibleDoctor[];
  selectedDoctor:
    | AccessibleDoctor
    | null;
  loading: boolean;
  selectDoctor:
    (
      doctorId:
        | string
        | null,
    ) => void;
};

const DoctorContext =
  createContext<
    DoctorContextValue
    | null
  >(null);

export function DoctorProvider({
  children,
}: {
  children: ReactNode;
}) {
  const { user } = useAuth();

  const queryClient =
    useQueryClient();

  const [doctors, setDoctors] =
    useState<
      AccessibleDoctor[]
    >([]);

  const [loading, setLoading] =
    useState(false);

  const [
    selectedId,
    setSelectedId,
  ] =
    useState<string | null>(
      () =>
        getSelectedDoctorId(),
    );

  useEffect(() => {
    if (!user) {
      setDoctors([]);
      setSelectedId(null);
      setSelectedDoctorId(
        null,
      );
      return;
    }

    let active = true;

    setLoading(true);

    getAccessibleDoctors()
      .then(items => {
        if (!active) {
          return;
        }

        setDoctors(items);

        const stored =
          getSelectedDoctorId();

        const validStored =
          stored
          && items.some(
            doctor =>
              doctor.doctorId
              === stored,
          );

        if (validStored) {
          setSelectedId(
            stored,
          );
          return;
        }

        if (items.length > 0) {
          const preferredDoctor =
            items.find(
              doctor =>
                doctor.isOwner,
            )
            ?? items[0];

          setSelectedId(
            preferredDoctor
              .doctorId,
          );

          setSelectedDoctorId(
            preferredDoctor
              .doctorId,
          );

          return;
        }

        setSelectedId(null);
        setSelectedDoctorId(null);
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [user]);

  const selectedDoctor =
    useMemo(
      () =>
        doctors.find(
          doctor =>
            doctor.doctorId
            === selectedId,
        )
        ?? null,
      [doctors, selectedId],
    );

  const value =
    useMemo<
      DoctorContextValue
    >(
      () => ({
        doctors,
        selectedDoctor,
        loading,
        selectDoctor:
          doctorId => {
            setSelectedId(
              doctorId,
            );

            setSelectedDoctorId(
              doctorId,
            );

            void queryClient
              .invalidateQueries();

            window.dispatchEvent(
              new CustomEvent(
                "clinic:doctor-scope-changed",
                {
                  detail:
                    doctorId,
                },
              ),
            );
          },
      }),
      [
        doctors,
        selectedDoctor,
        loading,
        queryClient,
      ],
    );

  return (
    <DoctorContext.Provider
      value={value}
    >
      {children}
    </DoctorContext.Provider>
  );
}

export function useDoctorContext() {
  const context =
    useContext(
      DoctorContext,
    );

  if (!context) {
    throw new Error(
      "useDoctorContext must be used inside DoctorProvider",
    );
  }

  return context;
}
