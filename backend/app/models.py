# app/models.py
from sqlalchemy import (
    Column, Integer, String, DateTime, ForeignKey, Boolean, UniqueConstraint,
    Index, Time, Enum as SAEnum
)

from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base
import enum


# -------------------------
# Enums / Choices
# -------------------------
class RolUsuario(str, enum.Enum):
    cliente = "cliente"
    emprendedor = "emprendedor"
    admin = "admin"


class EstadoTurno(str, enum.Enum):
    pendiente = "pendiente"
    confirmado = "confirmado"
    cancelado = "cancelado"


# -------------------------
# Usuario
# -------------------------


class Usuario(Base):
    __tablename__ = "usuarios"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(255), unique=True, index=True, nullable=False)
    email = Column(String(255), unique=True, index=True, nullable=True)
    password_hash = Column(String(255), nullable=False, default="")
    rol = Column(String(50), nullable=False, default=RolUsuario.cliente.value)
    avatar_url = Column(String(512), nullable=True)
    suscripcion_activa = Column(Boolean, nullable=False, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relaciones
    emprendedor = relationship(
        "Emprendedor",
        back_populates="usuario",
        uselist=False,
        cascade="all, delete-orphan",
        passive_deletes=True,
    )

    # Si querés saber los turnos pedidos por un usuario (cuando reserves “como cliente”)
    turnos = relationship(
        "Turno",
        back_populates="cliente",
        cascade="all, delete-orphan",
        passive_deletes=True,
        foreign_keys="Turno.cliente_id",
    )


# -------------------------
# Emprendedor
# -------------------------
class Emprendedor(Base):
    __tablename__ = "emprendedores"

    id = Column(Integer, primary_key=True, index=True)
    usuario_id = Column(Integer, ForeignKey("usuarios.id", ondelete="CASCADE"), nullable=False, unique=True)
    nombre = Column(String(255), nullable=False)          # obligatorio
    descripcion = Column(String(1000), nullable=True)
    codigo_cliente = Column(String(20), unique=True, nullable=True)  # para /reservar/:codigo
    activo = Column(Boolean, nullable=False, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    usuario = relationship("Usuario", back_populates="emprendedor")

    servicios = relationship(
        "Servicio",
        back_populates="emprendedor",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )
    horarios = relationship(
        "Horario",
        back_populates="emprendedor",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )
    turnos = relationship(
        "Turno",
        back_populates="emprendedor",
        cascade="all, delete-orphan",
        passive_deletes=True,
        foreign_keys="Turno.emprendedor_id",
    )


# -------------------------
# Servicio
# -------------------------
class Servicio(Base):
    __tablename__ = "servicios"

    id = Column(Integer, primary_key=True, index=True)
    emprendedor_id = Column(Integer, ForeignKey("emprendedores.id", ondelete="CASCADE"), nullable=False, index=True)
    nombre = Column(String(255), nullable=False)
    duracion_min = Column(Integer, nullable=False, default=30)
    # Precio en centavos (p. ej.: $4.990 => 499000). Evita problemas de coma flotante.
    precio = Column(Integer, nullable=False, default=0)
    activo = Column(Boolean, nullable=False, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    emprendedor = relationship("Emprendedor", back_populates="servicios")
    turnos = relationship("Turno", back_populates="servicio")

    __table_args__ = (
        # Evita repetir el mismo nombre de servicio en un mismo emprendedor si no querés duplicados exactos
        UniqueConstraint("emprendedor_id", "nombre", name="uq_servicio_nombre_por_emprendedor"),
        Index("ix_servicio_activo", "activo"),
    )


# -------------------------
# Horario (bloques de disponibilidad)
# -------------------------
class Horario(Base):
    __tablename__ = "horarios"

    id = Column(Integer, primary_key=True, index=True)
    emprendedor_id = Column(Integer, ForeignKey("emprendedores.id", ondelete="CASCADE"), nullable=False, index=True)

    # 0=Domingo ... 6=Sábado (coincide con datetime.weekday()? O con tu front. Ajustá si usás otro orden)
    # Si tu front usa 0=Domingo, mantené esta convención.
    dia_semana = Column(Integer, nullable=False)  # 0..6

    # Bloque horario (ej.: 09:00 a 13:00)
    desde = Column(Time(timezone=False), nullable=False)
    hasta = Column(Time(timezone=False), nullable=False)

    activo = Column(Boolean, nullable=False, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    emprendedor = relationship("Emprendedor", back_populates="horarios")

    __table_args__ = (
        # Evitar bloques idénticos duplicados
        UniqueConstraint("emprendedor_id", "dia_semana", "desde", "hasta", name="uq_horario_bloque"),
        Index("ix_horario_activo", "activo"),
    )


# -------------------------
# Turno
# -------------------------
class Turno(Base):
    __tablename__ = "turnos"

    id = Column(Integer, primary_key=True, index=True)

    # Dueño del calendario (obligatorio)
    emprendedor_id = Column(Integer, ForeignKey("emprendedores.id", ondelete="CASCADE"), nullable=False, index=True)

    # Servicio tomado (opcional si dejás crear “turno libre”, pero idealmente obligatorio)
    servicio_id = Column(Integer, ForeignKey("servicios.id", ondelete="SET NULL"), nullable=True, index=True)

    # Cliente que reservó (si es usuario del sistema). Puede ser null si la reserva es pública sin cuenta
    cliente_id = Column(Integer, ForeignKey("usuarios.id", ondelete="SET NULL"), nullable=True, index=True)

    # Datos básicos del turno
    inicio = Column(DateTime(timezone=True), nullable=False, index=True)
    fin = Column(DateTime(timezone=True), nullable=False, index=True)

    estado = Column(SAEnum(EstadoTurno), nullable=False, default=EstadoTurno.confirmado)
  # o pendiente/confirmado/cancelado
    motivo_cancelacion = Column(String(500), nullable=True)

    # Snapshot de precio al momento de crear el turno (centavos)
    precio_aplicado = Column(Integer, nullable=True)

    # Datos útiles para mostrar en la agenda si no hay usuario
    cliente_nombre = Column(String(255), nullable=True)
    cliente_contacto = Column(String(255), nullable=True)  # tel/email

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    emprendedor = relationship("Emprendedor", back_populates="turnos")
    servicio = relationship("Servicio", back_populates="turnos")
    cliente = relationship("Usuario", back_populates="turnos", foreign_keys=[cliente_id])

    __table_args__ = (
        # Un índice por rango de fechas del emprendedor ayuda a consultas por calendario
        Index("ix_turno_emprendedor_inicio", "emprendedor_id", "inicio"),
        Index("ix_turno_estado", "estado"),
    )
